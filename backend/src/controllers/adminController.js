// backend/src/controllers/adminController.js
const pool = require('../config/database');
const QRCode = require('qrcode');

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
}

module.exports = new AdminController();
