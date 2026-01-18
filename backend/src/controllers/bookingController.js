// backend/src/controllers/bookingController.js
const pool = require('../config/database');
const mpesaService = require('../config/mpesa');

class BookingController {
  async createBooking(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { event_id, number_of_tickets, phone_number } = req.body;
      const user_id = req.user.id;

      // NOTE: Database triggers now handle inventory checks and price calculation
      // Let the database be the source of truth to prevent race conditions

      // Create booking (triggers will handle validation and price calculation)
      const bookingResult = await client.query(
        `INSERT INTO bookings 
         (user_id, event_id, number_of_tickets, phone_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id, booking_reference, total_amount`,
        [user_id, event_id, number_of_tickets, phone_number]
      );

      const booking = bookingResult.rows[0];

      if (!booking) {
        throw new Error('Failed to create booking');
      }

      // Initiate M-Pesa payment (if amount > 0)
      let mpesaResponse = null;
      if (booking.total_amount > 0) {
        const eventResult = await client.query(
          'SELECT title FROM events WHERE id = $1',
          [event_id]
        );
        const eventTitle = eventResult.rows[0]?.title || 'Event';

        mpesaResponse = await mpesaService.stkPush(
          phone_number,
          booking.total_amount,
          booking.booking_reference,
          `Ticket purchase for ${eventTitle}`
        );

        // Create payment record
        await client.query(
          `INSERT INTO payments 
           (booking_id, phone_number, amount, merchant_request_id, checkout_request_id) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            booking.id,
            phone_number,
            booking.total_amount,
            mpesaResponse.MerchantRequestID,
            mpesaResponse.CheckoutRequestID
          ]
        );
      } else {
        // Free event - auto-confirm
        await client.query(
          "UPDATE bookings SET booking_status = 'confirmed' WHERE id = $1",
          [booking.id]
        );

        // Create zero-amount payment record
        await client.query(
          `INSERT INTO payments 
           (booking_id, phone_number, amount, payment_status) 
           VALUES ($1, $2, $3, 'successful')`,
          [booking.id, phone_number, 0]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          booking_reference: booking.booking_reference,
          total_amount: booking.total_amount,
          mpesa_response: mpesaResponse,
          message: mpesaResponse 
            ? 'Payment request sent to your phone' 
            : 'Free booking confirmed successfully'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Booking error:', error);
      
      // Handle database constraint errors
      if (error.message.includes('Sold Out') || error.message.includes('available tickets')) {
        return res.status(400).json({ 
          error: 'Not enough tickets available' 
        });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ 
          error: 'Booking already exists for this event' 
        });
      }
      
      res.status(400).json({ 
        error: error.message || 'Failed to create booking' 
      });
    } finally {
      client.release();
    }
  }

  async getUserBookings(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          b.*, 
          e.title, 
          e.event_date, 
          e.venue, 
          e.poster_url,
          e.county,
          p.payment_status,
          p.mpesa_receipt_number,
          COUNT(t.id) as tickets_generated
         FROM bookings b
         JOIN events e ON b.event_id = e.id
         LEFT JOIN payments p ON b.id = p.booking_id
         LEFT JOIN tickets t ON b.id = t.booking_id
         WHERE b.user_id = $1
         GROUP BY b.id, e.id, p.id
         ORDER BY b.booking_date DESC`,
        [req.user.id]
      );

      res.json({ 
        success: true,
        data: result.rows 
      });
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch bookings' 
      });
    }
  }

  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT 
          b.*, 
          e.title, 
          e.event_date, 
          e.venue, 
          e.location,
          e.county,
          e.poster_url,
          p.payment_status,
          p.mpesa_receipt_number,
          p.payment_date,
          p.processed_at,
          p.result_desc
         FROM bookings b
         JOIN events e ON b.event_id = e.id
         LEFT JOIN payments p ON b.id = p.booking_id
         WHERE b.id = $1 AND b.user_id = $2`,
        [id, req.user.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'Booking not found' 
        });
      }

      res.json({ 
        success: true,
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Get booking by ID error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch booking details' 
      });
    }
  }

  async cancelBooking(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;

      // Check if booking exists and belongs to user
      const checkResult = await client.query(
        `SELECT b.*, p.payment_status, e.event_date
         FROM bookings b
         LEFT JOIN payments p ON b.id = p.booking_id
         JOIN events e ON b.event_id = e.id
         WHERE b.id = $1 AND b.user_id = $2`,
        [id, req.user.id]
      );

      if (!checkResult.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'Booking not found' 
        });
      }

      const booking = checkResult.rows[0];

      // Check if booking can be cancelled
      if (booking.booking_status === 'cancelled') {
        return res.status(400).json({ 
          success: false,
          error: 'Booking is already cancelled' 
        });
      }

      if (booking.booking_status === 'refunded') {
        return res.status(400).json({ 
          success: false,
          error: 'Booking has already been refunded' 
        });
      }

      // Check if event has already passed
      const eventDate = new Date(booking.event_date);
      if (eventDate < new Date()) {
        return res.status(400).json({ 
          success: false,
          error: 'Cannot cancel booking for past event' 
        });
      }

      // Cancel booking (database trigger will handle inventory)
      const updateResult = await client.query(
        `UPDATE bookings 
         SET booking_status = 'cancelled', notes = 'Cancelled by user'
         WHERE id = $1 
         RETURNING *`,
        [id]
      );

      // Update payment status if payment was made
      if (booking.payment_status === 'successful') {
        await client.query(
          `UPDATE payments 
           SET payment_status = 'cancelled', 
               result_desc = 'Booking cancelled by user'
           WHERE booking_id = $1`,
          [id]
        );
      }

      await client.query('COMMIT');

      res.json({ 
        success: true,
        message: 'Booking cancelled successfully',
        data: updateResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Cancel booking error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to cancel booking' 
      });
    } finally {
      client.release();
    }
  }

  async getUserTickets(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          t.*,
          b.booking_reference,
          e.title as event_title,
          e.event_date,
          e.venue,
          e.location,
          e.county
         FROM tickets t
         JOIN bookings b ON t.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         WHERE b.user_id = $1
         AND t.ticket_status = 'active'
         AND e.event_date > NOW()
         ORDER BY e.event_date ASC`,
        [req.user.id]
      );

      res.json({ 
        success: true,
        data: result.rows 
      });
    } catch (error) {
      console.error('Get user tickets error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch tickets' 
      });
    }
  }

  async getTicketById(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT 
          t.*,
          b.booking_reference,
          b.number_of_tickets,
          e.title as event_title,
          e.event_date,
          e.venue,
          e.location,
          e.county,
          e.description,
          u.full_name as attendee_name,
          u.email as attendee_email
         FROM tickets t
         JOIN bookings b ON t.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         JOIN users u ON b.user_id = u.id
         WHERE t.id = $1 AND b.user_id = $2`,
        [id, req.user.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'Ticket not found' 
        });
      }

      res.json({ 
        success: true,
        data: result.rows[0] 
      });
    } catch (error) {
      console.error('Get ticket by ID error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch ticket details' 
      });
    }
  }

  async getTicketQR(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT t.qr_code_url, t.ticket_code
         FROM tickets t
         JOIN bookings b ON t.booking_id = b.id
         WHERE t.id = $1 AND b.user_id = $2`,
        [id, req.user.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'Ticket not found' 
        });
      }

      const ticket = result.rows[0];
      
      if (!ticket.qr_code_url) {
        return res.status(404).json({ 
          success: false,
          error: 'QR code not available for this ticket' 
        });
      }

      // Return QR code data
      res.json({ 
        success: true,
        data: {
          qr_code: ticket.qr_code_url,
          ticket_code: ticket.ticket_code
        }
      });
    } catch (error) {
      console.error('Get ticket QR error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch QR code' 
      });
    }
  }
}

// Export individual methods for Express routing
const bookingController = new BookingController();

module.exports = {
  createBooking: bookingController.createBooking.bind(bookingController),
  getUserBookings: bookingController.getUserBookings.bind(bookingController),
  getBookingById: bookingController.getBookingById.bind(bookingController),
  cancelBooking: bookingController.cancelBooking.bind(bookingController),
  getUserTickets: bookingController.getUserTickets.bind(bookingController),
  getTicketById: bookingController.getTicketById.bind(bookingController),
  getTicketQR: bookingController.getTicketQR.bind(bookingController)
};