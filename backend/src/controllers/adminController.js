// backend/src/controllers/adminController.js
const pool = require('../config/database');
const QRCode = require('qrcode');
const { get } = require('../routes');

class AdminController {
  async getDashboardStats(req, res) {
    try {
      const [
        totalEvents,
        totalBookings,
        totalRevenue,
        pendingPayments,
        recentBookings,
        revenueChart
      ] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM events WHERE is_published = true"),
        pool.query("SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed'"),
        pool.query("SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE booking_status = 'confirmed'"),
        pool.query("SELECT COUNT(*) FROM payments WHERE payment_status = 'pending'"),
        pool.query(
          `SELECT b.booking_reference, b.booking_date, b.total_amount, 
                  e.title, u.full_name, p.payment_status
           FROM bookings b
           JOIN events e ON b.event_id = e.id
           JOIN users u ON b.user_id = u.id
           JOIN payments p ON b.id = p.booking_id
           ORDER BY b.booking_date DESC LIMIT 10`
        ),
        pool.query(
          `SELECT DATE(booking_date) as date, 
                  SUM(total_amount) as revenue,
                  COUNT(*) as bookings
           FROM bookings 
           WHERE booking_status = 'confirmed'
           AND booking_date >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY DATE(booking_date)
           ORDER BY date`
        )
      ]);

      res.json({
        data: {
          totalEvents: parseInt(totalEvents.rows[0].count),
          totalBookings: parseInt(totalBookings.rows[0].count),
          totalRevenue: parseFloat(totalRevenue.rows[0].coalesce),
          pendingPayments: parseInt(pendingPayments.rows[0].count),
          recentBookings: recentBookings.rows,
          revenueChart: revenueChart.rows
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }

  async approvePayment(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { payment_id } = req.params;
      const { action } = req.body; // 'approve' or 'reject'

      // Update payment status
      await client.query(
        `UPDATE payments 
         SET payment_status = $1, 
             processed_by_admin = $2,
             processed_at = CURRENT_TIMESTAMP
         WHERE id = $3 
         RETURNING booking_id, amount`,
        [action === 'approve' ? 'successful' : 'failed', req.user.id, payment_id]
      );

      if (action === 'approve') {
        // Generate tickets
        const paymentResult = await client.query(
          `SELECT b.*, e.title, u.email, u.phone_number, u.full_name
           FROM payments p
           JOIN bookings b ON p.booking_id = b.id
           JOIN events e ON b.event_id = e.id
           JOIN users u ON b.user_id = u.id
           WHERE p.id = $1`,
          [payment_id]
        );

        const booking = paymentResult.rows[0];

        // Generate unique ticket codes and QR codes
        const tickets = [];
        for (let i = 0; i < booking.number_of_tickets; i++) {
          const ticketCode = `TKT-${booking.booking_reference}-${i + 1}`;
          const qrData = JSON.stringify({
            ticketCode,
            event: booking.title,
            bookingReference: booking.booking_reference,
            attendee: booking.full_name,
            timestamp: new Date().toISOString()
          });

          const qrCodeUrl = await QRCode.toDataURL(qrData);

          tickets.push({
            booking_id: booking.id,
            ticket_code: ticketCode,
            qr_code_url: qrCodeUrl,
            attendee_name: booking.full_name,
            attendee_email: booking.email,
            attendee_phone: booking.phone_number
          });
        }

        // Insert tickets in batch
        for (const ticket of tickets) {
          await client.query(
            `INSERT INTO tickets 
             (booking_id, ticket_code, qr_code_url, attendee_name, attendee_email, attendee_phone)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            Object.values(ticket)
          );
        }

        // Update booking status
        await client.query(
          "UPDATE bookings SET booking_status = 'confirmed' WHERE id = $1",
          [booking.id]
        );

        // Update event sold tickets
        await client.query(
          'UPDATE events SET sold_tickets = sold_tickets + $1 WHERE id = $2',
          [booking.number_of_tickets, booking.event_id]
        );
      } else {
        // Reject payment - release reserved tickets
        const paymentResult = await client.query(
          'SELECT b.event_id, b.number_of_tickets FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE p.id = $1',
          [payment_id]
        );

        const { event_id, number_of_tickets } = paymentResult.rows[0];

        await client.query(
          'UPDATE events SET available_tickets = available_tickets + $1 WHERE id = $2',
          [number_of_tickets, event_id]
        );

        await client.query(
          "UPDATE bookings SET booking_status = 'cancelled' WHERE id = (SELECT booking_id FROM payments WHERE id = $1)",
          [payment_id]
        );
      }

      await client.query('COMMIT');

      res.json({ 
        success: true, 
        message: `Payment ${action}d successfully` 
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Payment approval error:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    } finally {
      client.release();
    }
  }

  async getAllBookings(req, res) {
    try {
      const { status, event_id, date_from, date_to } = req.query;
      
      let query = `
        SELECT 
          b.*,
          u.full_name,
          u.email,
          u.phone_number as user_phone,
          e.title,
          e.venue,
          e.event_date,
          p.payment_status,
          p.mpesa_receipt_number
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN events e ON b.event_id = e.id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;

      if (status) {
        query += ` AND b.booking_status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      if (event_id) {
        query += ` AND b.event_id = $${paramCount}`;
        values.push(event_id);
        paramCount++;
      }

      if (date_from) {
        query += ` AND b.booking_date >= $${paramCount}`;
        values.push(date_from);
        paramCount++;
      }

      if (date_to) {
        query += ` AND b.booking_date <= $${paramCount}`;
        values.push(date_to);
        paramCount++;
      }

      query += ' ORDER BY b.booking_date DESC';

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get all bookings error:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  async getAllPayments(req, res) {
    try {
      const { status, date_from, date_to } = req.query;
      
      let query = `
        SELECT 
          p.*,
          b.booking_reference,
          b.number_of_tickets,
          u.full_name as customer_name,
          u.email as customer_email,
          e.title as event_title
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN users u ON b.user_id = u.id
        JOIN events e ON b.event_id = e.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;

      if (status) {
        query += ` AND p.payment_status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      if (date_from) {
        query += ` AND p.payment_date >= $${paramCount}`;
        values.push(date_from);
        paramCount++;
      }

      if (date_to) {
        query += ` AND p.payment_date <= $${paramCount}`;
        values.push(date_to);
        paramCount++;
      }

      query += ' ORDER BY p.payment_date DESC';

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  }

  async validateTicket(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { ticket_code, validation_method = 'qr' } = req.body;
      const admin_id = req.user.id;

      // Find ticket
      const ticketResult = await client.query(
        `SELECT t.*, 
                b.booking_reference,
                e.title as event_title,
                e.event_date,
                e.venue,
                u.full_name as customer_name
         FROM tickets t
         JOIN bookings b ON t.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         JOIN users u ON b.user_id = u.id
         WHERE t.ticket_code = $1 OR t.id::text = $1`,
        [ticket_code]
      );

      if (!ticketResult.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found'
        });
      }

      const ticket = ticketResult.rows[0];

      // Check if ticket is already validated
      if (ticket.is_validated) {
        return res.status(400).json({
          success: false,
          error: 'Ticket already validated',
          data: {
            ticket_code: ticket.ticket_code,
            validated_at: ticket.validated_at,
            validated_by: ticket.validated_by
          }
        });
      }

      // Check if ticket is active
      if (ticket.ticket_status !== 'active') {
        return res.status(400).json({
          success: false,
          error: `Ticket is ${ticket.ticket_status}`,
          data: {
            ticket_code: ticket.ticket_code,
            status: ticket.ticket_status
          }
        });
      }

      // Validate ticket
      await client.query(
        `UPDATE tickets 
         SET is_validated = true,
             validated_at = CURRENT_TIMESTAMP,
             validated_by = $1,
             ticket_status = 'used'
         WHERE id = $2`,
        [admin_id, ticket.id]
      );

      // Log validation
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          admin_id,
          'VALIDATE_TICKET',
          'tickets',
          ticket.id,
          JSON.stringify({
            ticket_code: ticket.ticket_code,
            validation_method: validation_method,
            validated_at: new Date().toISOString()
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Ticket validated successfully',
        data: {
          ticket_code: ticket.ticket_code,
          event: ticket.event_title,
          customer: ticket.customer_name,
          validated_at: new Date().toISOString(),
          validated_by: req.user.full_name
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Validate ticket error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate ticket'
      });
    } finally {
      client.release();
    }
  }

  async getAllEvents(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          e.*,
          u.full_name as organizer_name,
          u.email as organizer_email,
          (SELECT COUNT(*) FROM bookings b WHERE b.event_id = e.id AND b.booking_status = 'confirmed') as total_bookings
         FROM events e
         JOIN users u ON e.organizer_id = u.id
         ORDER BY e.created_at DESC`
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get all events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  async getRevenueReports(req, res) {
    try {
      const { period = 'monthly', start_date, end_date } = req.query;
      
      let dateFormat, groupBy;
      
      switch (period) {
        case 'daily':
          dateFormat = 'YYYY-MM-DD';
          groupBy = 'DATE(p.payment_date)';
          break;
        case 'weekly':
          dateFormat = 'IYYY-IW';
          groupBy = 'EXTRACT(YEAR FROM p.payment_date) || EXTRACT(WEEK FROM p.payment_date)';
          break;
        case 'monthly':
        default:
          dateFormat = 'YYYY-MM';
          groupBy = 'DATE_TRUNC(\'month\', p.payment_date)';
          break;
        case 'yearly':
          dateFormat = 'YYYY';
          groupBy = 'EXTRACT(YEAR FROM p.payment_date)';
          break;
      }

      let query = `
        SELECT 
          ${groupBy} as period,
          COUNT(DISTINCT p.id) as total_transactions,
          COUNT(DISTINCT b.id) as total_bookings,
          SUM(p.amount) as total_revenue,
          AVG(p.amount) as average_transaction,
          MIN(p.amount) as min_transaction,
          MAX(p.amount) as max_transaction
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE p.payment_status = 'successful'
      `;
      
      const values = [];
      let paramCount = 1;

      if (start_date) {
        query += ` AND p.payment_date >= $${paramCount}`;
        values.push(start_date);
        paramCount++;
      }

      if (end_date) {
        query += ` AND p.payment_date <= $${paramCount}`;
        values.push(end_date);
        paramCount++;
      }

      query += ` GROUP BY ${groupBy} ORDER BY period DESC`;

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: {
          period: period,
          reports: result.rows,
          summary: {
            total_revenue: result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0),
            total_transactions: result.rows.reduce((sum, row) => sum + parseInt(row.total_transactions || 0), 0),
            total_bookings: result.rows.reduce((sum, row) => sum + parseInt(row.total_bookings || 0), 0)
          }
        }
      });
    } catch (error) {
      console.error('Get revenue reports error:', error);
      res.status(500).json({ error: 'Failed to fetch revenue reports' });
    }
  }
}

// Don't forget to export the methods
const adminController = new AdminController();

module.exports = {
  getDashboardStats: adminController.getDashboardStats.bind(adminController),
  approvePayment: adminController.approvePayment.bind(adminController),
  getAllBookings: adminController.getAllBookings.bind(adminController),
  getAllPayments: adminController.getAllPayments.bind(adminController),
  validateTicket: adminController.validateTicket.bind(adminController),
  getRevenueReports: adminController.getRevenueReports.bind(adminController),
  getAllEvents: adminController.getAllEvents.bind(adminController),
};

