// backend/src/controllers/adminController.js - FIXED VERSION
const pool = require('../config/database');

class AdminController {
  // Dashboard Statistics - FIXED to include proper revenue data
  async getDashboardStats(req, res) {
    try {
      const [
        totalEventsResult,
        totalBookingsResult,
        totalRevenueResult,
        pendingPaymentsResult,
        totalUsersResult,
        recentBookingsResult,
        revenueChartResult,
        todayRevenueResult,
        activeEventsResult,
        ticketsSoldResult
      ] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM events WHERE is_published = true AND is_cancelled = false"),
        pool.query("SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed'"),
        pool.query(`
          SELECT COALESCE(SUM(p.amount), 0) as total_revenue 
          FROM payments p 
          WHERE p.payment_status = 'successful'
        `),
        pool.query("SELECT COUNT(*) FROM payments WHERE payment_status = 'pending'"),
        pool.query("SELECT COUNT(*) FROM users"),
        pool.query(
          `SELECT 
            b.id,
            b.booking_reference,
            b.booking_status,
            b.number_of_tickets,
            b.total_amount,
            b.booking_date,
            e.title as event_title,
            e.venue,
            u.full_name as customer_name,
            p.payment_status,
            p.mpesa_receipt_number
           FROM bookings b
           LEFT JOIN events e ON b.event_id = e.id
           LEFT JOIN users u ON b.user_id = u.id
           LEFT JOIN payments p ON b.id = p.booking_id
           ORDER BY b.booking_date DESC 
           LIMIT 10`
        ),
        pool.query(
          `SELECT 
            DATE(p.payment_date) as date, 
            SUM(p.amount) as revenue,
            COUNT(p.id) as transactions
           FROM payments p
           WHERE p.payment_status = 'successful'
           AND p.payment_date >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY DATE(p.payment_date)
           ORDER BY date ASC`
        ),
        pool.query(`
          SELECT COALESCE(SUM(p.amount), 0) as today_revenue
          FROM payments p
          WHERE p.payment_status = 'successful'
          AND DATE(p.payment_date) = CURRENT_DATE
        `),
        pool.query(`
          SELECT COUNT(*) as active_events
          FROM events 
          WHERE is_published = true 
          AND is_cancelled = false
          AND event_date >= CURRENT_DATE
        `),
        pool.query(`
          SELECT COALESCE(SUM(sold_tickets), 0) as total_tickets_sold
          FROM events
        `)
      ]);

      // Process revenue chart data
      const revenueChartData = revenueChartResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        revenue: parseFloat(row.revenue) || 0,
        transactions: parseInt(row.transactions) || 0
      }));

      // Fill missing dates in revenue chart
      const filledChartData = this.fillMissingDates(revenueChartData);

      res.json({
        success: true,
        data: {
          totalEvents: parseInt(totalEventsResult.rows[0].count) || 0,
          totalBookings: parseInt(totalBookingsResult.rows[0].count) || 0,
          totalRevenue: parseFloat(totalRevenueResult.rows[0].total_revenue) || 0,
          pendingPayments: parseInt(pendingPaymentsResult.rows[0].count) || 0,
          totalUsers: parseInt(totalUsersResult.rows[0].count) || 0,
          todayRevenue: parseFloat(todayRevenueResult.rows[0].today_revenue) || 0,
          activeEvents: parseInt(activeEventsResult.rows[0].active_events) || 0,
          ticketsSold: parseInt(ticketsSoldResult.rows[0].total_tickets_sold) || 0,
          recentBookings: recentBookingsResult.rows.map(booking => ({
            ...booking,
            total_amount: parseFloat(booking.total_amount) || 0
          })),
          revenueChart: filledChartData,
          // Add quick stats
          quickStats: {
            conversionRate: this.calculateConversionRate(totalBookingsResult.rows[0].count, totalUsersResult.rows[0].count),
            avgTicketPrice: this.calculateAvgTicketPrice(totalRevenueResult.rows[0].total_revenue, totalBookingsResult.rows[0].count),
            occupancyRate: this.calculateOccupancyRate(ticketsSoldResult.rows[0].total_tickets_sold, totalEventsResult.rows[0].count)
          }
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch dashboard stats' 
      });
    }
  }

  // Helper function to fill missing dates in chart data
  fillMissingDates(chartData) {
    if (chartData.length === 0) return [];
    
    const result = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    for (let i = 0; i <= 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const existingData = chartData.find(item => item.date === dateStr);
      result.push({
        date: dateStr,
        revenue: existingData ? existingData.revenue : 0,
        transactions: existingData ? existingData.transactions : 0
      });
    }
    
    return result;
  }

  // Helper function to calculate conversion rate
  calculateConversionRate(totalBookings, totalUsers) {
    if (!totalUsers || totalUsers === 0) return 0;
    return Math.round((totalBookings / totalUsers) * 100);
  }

  // Helper function to calculate average ticket price
  calculateAvgTicketPrice(totalRevenue, totalBookings) {
    if (!totalBookings || totalBookings === 0) return 0;
    return Math.round(totalRevenue / totalBookings);
  }

  // Helper function to calculate occupancy rate (simplified)
  calculateOccupancyRate(ticketsSold, totalEvents) {
    if (!totalEvents || totalEvents === 0) return 0;
    // Assuming average capacity per event is 100
    const avgCapacity = 100;
    const totalCapacity = totalEvents * avgCapacity;
    return Math.round((ticketsSold / totalCapacity) * 100);
  }

  // Get All Events (Admin) - Fixed with better data handling
  async getAllEvents(req, res) {
    try {
      const { organizer_id, is_published, category, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const filters = [];
      const values = [];
      let paramCount = 1;

      if (organizer_id) {
        filters.push(`e.organizer_id = $${paramCount}`);
        values.push(organizer_id);
        paramCount++;
      }

      if (is_published !== undefined) {
        filters.push(`e.is_published = $${paramCount}`);
        values.push(is_published === 'true');
        paramCount++;
      }

      if (category) {
        filters.push(`e.category = $${paramCount}`);
        values.push(category);
        paramCount++;
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      // Count query
      const countQuery = `SELECT COUNT(*) FROM events e ${whereClause}`;
      const countResult = await pool.query(countQuery, values);

      // Data query with aggregations
      const dataQuery = `
        SELECT 
          e.*,
          u.full_name as organizer_name,
          u.email as organizer_email,
          COALESCE((
            SELECT COUNT(*) 
            FROM bookings b 
            WHERE b.event_id = e.id 
            AND b.booking_status = 'confirmed'
          ), 0) as confirmed_bookings,
          COALESCE((
            SELECT SUM(b.total_amount)
            FROM bookings b 
            WHERE b.event_id = e.id 
            AND b.booking_status = 'confirmed'
          ), 0) as total_revenue,
          COALESCE((
            SELECT COUNT(*)
            FROM tickets t
            JOIN bookings b ON t.booking_id = b.id
            WHERE b.event_id = e.id
            AND b.booking_status = 'confirmed'
          ), 0) as tickets_sold
        FROM events e
        LEFT JOIN users u ON e.organizer_id = u.id
        ${whereClause}
        ORDER BY e.event_date DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const dataValues = [...values, parseInt(limit), offset];
      const result = await pool.query(dataQuery, dataValues);

      res.json({
        success: true,
        data: result.rows.map(event => ({
          ...event,
          confirmed_bookings: parseInt(event.confirmed_bookings),
          total_revenue: parseFloat(event.total_revenue),
          tickets_sold: parseInt(event.tickets_sold),
          ticket_price: parseFloat(event.ticket_price),
          available_tickets: parseInt(event.available_tickets),
          sold_tickets: parseInt(event.sold_tickets)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Get all events error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch events' 
      });
    }
  }

  // Get All Bookings (Admin) - Fixed with proper SQL structure
  async getAllBookings(req, res) {
    try {
      const { status, event_id, user_id, date_from, date_to, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const filters = [];
      const values = [];
      let paramCount = 1;

      if (status) {
        filters.push(`b.booking_status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (event_id) {
        filters.push(`b.event_id = $${paramCount}`);
        values.push(event_id);
        paramCount++;
      }

      if (user_id) {
        filters.push(`b.user_id = $${paramCount}`);
        values.push(user_id);
        paramCount++;
      }

      if (date_from) {
        filters.push(`b.booking_date >= $${paramCount}`);
        values.push(date_from);
        paramCount++;
      }

      if (date_to) {
        filters.push(`b.booking_date <= $${paramCount}`);
        values.push(date_to);
        paramCount++;
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      // Count query
      const countQuery = `SELECT COUNT(*) FROM bookings b ${whereClause}`;
      const countResult = await pool.query(countQuery, values);

      // Data query with joins
      const dataQuery = `
        SELECT 
          b.*,
          u.full_name,
          u.email as user_email,
          u.phone_number as user_phone,
          e.title,
          e.venue,
          e.event_date,
          e.county,
          e.poster_url,
          p.payment_status,
          p.mpesa_receipt_number,
          p.payment_date,
          p.amount as payment_amount
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN events e ON b.event_id = e.id
        LEFT JOIN payments p ON b.id = p.booking_id
        ${whereClause}
        ORDER BY b.booking_date DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const dataValues = [...values, parseInt(limit), offset];
      const result = await pool.query(dataQuery, dataValues);

      res.json({
        success: true,
        data: result.rows.map(booking => ({
          ...booking,
          total_amount: parseFloat(booking.total_amount) || 0,
          number_of_tickets: parseInt(booking.number_of_tickets) || 0,
          payment_amount: booking.payment_amount ? parseFloat(booking.payment_amount) : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Get all bookings error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch bookings' 
      });
    }
  }

  // Get All Payments (Admin) - Fixed with proper SQL structure
  async getAllPayments(req, res) {
    try {
      const { status, event_id, booking_id, date_from, date_to, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const filters = [];
      const values = [];
      let paramCount = 1;

      if (status) {
        filters.push(`p.payment_status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (event_id) {
        filters.push(`e.id = $${paramCount}`);
        values.push(event_id);
        paramCount++;
      }

      if (booking_id) {
        filters.push(`p.booking_id = $${paramCount}`);
        values.push(booking_id);
        paramCount++;
      }

      if (date_from) {
        filters.push(`p.payment_date >= $${paramCount}`);
        values.push(date_from);
        paramCount++;
      }

      if (date_to) {
        filters.push(`p.payment_date <= $${paramCount}`);
        values.push(date_to);
        paramCount++;
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) 
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN events e ON b.event_id = e.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, values);

      // Data query with joins
      const dataQuery = `
        SELECT 
          p.*,
          b.booking_reference,
          b.number_of_tickets,
          b.total_amount as booking_total,
          b.booking_status,
          u.full_name as customer_name,
          u.email as customer_email,
          u.phone_number as customer_phone,
          e.title as event_title,
          e.event_date,
          e.venue
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN events e ON b.event_id = e.id
        ${whereClause}
        ORDER BY p.payment_date DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const dataValues = [...values, parseInt(limit), offset];
      const result = await pool.query(dataQuery, dataValues);

      res.json({
        success: true,
        data: result.rows.map(payment => ({
          ...payment,
          amount: parseFloat(payment.amount) || 0,
          booking_total: payment.booking_total ? parseFloat(payment.booking_total) : null,
          number_of_tickets: payment.number_of_tickets ? parseInt(payment.number_of_tickets) : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch payments' 
      });
    }
  }

  // Fixed approvePayment method to handle parameter mismatch
  async approvePayment(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Use req.params.id (from routes) or req.params.payment_id (legacy)
      const { id } = req.params;
      const paymentId = id; // The route uses :id
      
      const { action } = req.body; // 'approve' or 'reject'

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          error: 'Payment id is required'
        });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid payment ID format. Must be a valid UUID.' 
        });
      }

      // Get payment details with booking and event info
      const paymentResult = await client.query(
        `SELECT 
          p.*, 
          b.id as booking_id,
          b.booking_reference,
          b.number_of_tickets,
          b.user_id,
          b.event_id,
          b.total_amount,
          e.title,
          e.available_tickets,
          e.sold_tickets,
          u.full_name,
          u.email,
          u.phone_number
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         JOIN users u ON b.user_id = u.id
         WHERE p.id = $1`,
        [paymentId]
      );

      if (!paymentResult.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'Payment not found' 
        });
      }

      const payment = paymentResult.rows[0];

      // Check if payment is pending
      if (payment.payment_status !== 'pending') {
        return res.status(400).json({ 
          success: false,
          error: `Payment is already ${payment.payment_status}` 
        });
      }

      const paymentStatus = action === 'approve' ? 'successful' : 'failed';
      
      // Update payment status
      await client.query(
        `UPDATE payments 
         SET payment_status = $1, 
             processed_by_admin = $2,
             processed_at = CURRENT_TIMESTAMP,
             result_desc = $3
         WHERE id = $4`,
        [
          paymentStatus,
          req.user.id,
          action === 'approve' ? 'Approved by admin' : 'Rejected by admin',
          paymentId
        ]
      );

      if (action === 'approve') {
        // Update booking status
        await client.query(
          `UPDATE bookings 
           SET booking_status = 'confirmed',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [payment.booking_id]
        );

        // Generate tickets
        await this.generateTickets(client, payment);
        
        // Update event inventory (trigger will handle this, but we can also update directly)
        await client.query(
          `UPDATE events 
           SET available_tickets = available_tickets - $1,
               sold_tickets = sold_tickets + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [payment.number_of_tickets, payment.event_id]
        );
      } else {
        // Reject payment
        await client.query(
          `UPDATE bookings 
           SET booking_status = 'cancelled',
               notes = CONCAT(COALESCE(notes, ''), ' Payment rejected by admin.'),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [payment.booking_id]
        );
      }

      // Log admin action
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          action === 'approve' ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
          'payments',
          paymentId,
          JSON.stringify({
            payment_status: paymentStatus,
            amount: payment.amount,
            booking_reference: payment.booking_reference,
            processed_by: req.user.full_name,
            processed_at: new Date().toISOString()
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Payment ${action}d successfully`,
        data: {
          payment_id: paymentId,
          booking_reference: payment.booking_reference,
          status: paymentStatus,
          amount: payment.amount
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Approve payment error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process payment' 
      });
    } finally {
      client.release();
    }
  }

  // Enhanced generateTickets helper
  async generateTickets(client, booking) {
    try {
      const QRCode = require('qrcode');
      const tickets = [];
      
      // Generate tickets for each ticket in booking
      for (let i = 0; i < booking.number_of_tickets; i++) {
        const ticketCode = `TH-${booking.booking_reference}-${String(i + 1).padStart(3, '0')}`;
        
        // Create QR code data
        const qrData = JSON.stringify({
          ticketId: ticketCode,
          eventId: booking.event_id,
          eventTitle: booking.title,
          bookingReference: booking.booking_reference,
          attendeeName: booking.full_name,
          attendeeEmail: booking.email,
          eventDate: booking.event_date,
          venue: booking.venue,
          issuedAt: new Date().toISOString(),
          type: 'standard'
        });

        // Generate QR code as base64
        const qrCodeUrl = await QRCode.toDataURL(qrData);

        await client.query(
          `INSERT INTO tickets 
           (booking_id, ticket_code, qr_code_url, attendee_name, 
            attendee_email, attendee_phone, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [
            booking.booking_id,
            ticketCode,
            qrCodeUrl,
            booking.full_name,
            booking.email,
            booking.phone_number
          ]
        );

        tickets.push(ticketCode);
      }

      console.log(`Generated ${booking.number_of_tickets} tickets for booking ${booking.booking_reference}`);
      return tickets;

    } catch (error) {
      console.error('Ticket generation error:', error);
      throw error;
    }
  }

  // Get All Users (Admin)
  async getAllUsers(req, res) {
    try {
      const { role, is_active, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT id, email, full_name, phone_number, role, is_active, 
               created_at, updated_at, last_login
        FROM users 
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (role) {
        query += ` AND role = $${paramCount}`;
        values.push(role);
        paramCount++;
      }

      if (is_active !== undefined) {
        query += ` AND is_active = $${paramCount}`;
        values.push(is_active === 'true');
        paramCount++;
      }

      // Get total count
      const countQuery = query.replace('SELECT id, email, full_name, phone_number, role, is_active, created_at, updated_at, last_login', 'SELECT COUNT(*)');
      const countResult = await pool.query(countQuery, values);

      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(parseInt(limit), offset);

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch users' 
      });
    }
  }

  // Update User (Admin)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating yourself if trying to deactivate
      if (id === req.user.id && updates.is_active === false) {
        return res.status(400).json({ 
          success: false,
          error: 'Cannot deactivate your own account' 
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (['full_name', 'email', 'phone_number', 'is_active', 'role'].includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No valid fields to update' 
        });
      }

      values.push(id);
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING id, email, full_name, phone_number, role, is_active, created_at
      `;

      const result = await pool.query(updateQuery, values);

      if (!result.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // Log admin action
      await pool.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'UPDATE_USER',
          'users',
          id,
          JSON.stringify(updates)
        ]
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update user' 
      });
    }
  }

  // Update User Role (Admin)
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'client'].includes(role)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid role. Must be admin or client' 
        });
      }

      // Don't allow changing your own role
      if (id === req.user.id) {
        return res.status(400).json({ 
          success: false,
          error: 'Cannot change your own role' 
        });
      }

      const result = await pool.query(
        `UPDATE users 
         SET role = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, email, full_name, role`,
        [role, id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // Log admin action
      await pool.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'UPDATE_USER_ROLE',
          'users',
          id,
          JSON.stringify({ role })
        ]
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update user role' 
      });
    }
  }

  // Delete User (Admin)
  async deleteUser(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;

      // Don't allow deleting yourself
      if (id === req.user.id) {
        return res.status(400).json({ 
          success: false,
          error: 'Cannot delete your own account' 
        });
      }

      // Check if user exists and get details for audit log
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      if (!userResult.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      const user = userResult.rows[0];

      // Check if user has any bookings
      const bookingsResult = await client.query(
        'SELECT COUNT(*) FROM bookings WHERE user_id = $1',
        [id]
      );

      const hasBookings = parseInt(bookingsResult.rows[0].count) > 0;

      if (hasBookings) {
        // Soft delete (deactivate) instead of hard delete
        await client.query(
          'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [id]
        );

        // Log admin action
        await client.query(
          `INSERT INTO audit_logs 
           (admin_id, action, table_name, record_id, old_values)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.id,
            'DEACTIVATE_USER',
            'users',
            id,
            JSON.stringify({
              email: user.email,
              full_name: user.full_name,
              reason: 'User has bookings, deactivated instead of deleted'
            })
          ]
        );

        await client.query('COMMIT');

        return res.json({
          success: true,
          message: 'User deactivated successfully (user has bookings)'
        });
      }

      // Hard delete user (no bookings)
      await client.query('DELETE FROM users WHERE id = $1', [id]);

      // Log admin action
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, old_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'DELETE_USER',
          'users',
          id,
          JSON.stringify({
            email: user.email,
            full_name: user.full_name
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete user error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete user' 
      });
    } finally {
      client.release();
    }
  }

  // Get Revenue Reports
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

      // Calculate summary
      const summary = {
        total_revenue: result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0),
        total_transactions: result.rows.reduce((sum, row) => sum + parseInt(row.total_transactions || 0), 0),
        total_bookings: result.rows.reduce((sum, row) => sum + parseInt(row.total_bookings || 0), 0)
      };

      res.json({
        success: true,
        data: {
          period: period,
          reports: result.rows,
          summary: summary
        }
      });
    } catch (error) {
      console.error('Get revenue reports error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch revenue reports' 
      });
    }
  }

  // Validate Ticket (Admin)
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

      // Check if event has passed
      if (new Date(ticket.event_date) < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Event has already passed',
          data: {
            ticket_code: ticket.ticket_code,
            event_date: ticket.event_date
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

  // Update Booking Status (Admin)
  async updateBookingStatus(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { booking_id } = req.params;
      const { status, notes } = req.body;

      if (!['confirmed', 'cancelled', 'refunded'].includes(status)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid status. Must be confirmed, cancelled, or refunded' 
        });
      }

      // Get current booking status
      const bookingResult = await client.query(
        'SELECT * FROM bookings WHERE id = $1',
        [booking_id]
      );

      if (!bookingResult.rows.length) {
        return res.status(404).json({ 
          success: false,
          error: 'Booking not found' 
        });
      }

      const booking = bookingResult.rows[0];

      // Update booking status
      const updateQuery = `
        UPDATE bookings 
        SET booking_status = $1, 
            notes = COALESCE($2, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(updateQuery, [status, notes, booking_id]);

      // If moving to confirmed, generate tickets if not already generated
      if (status === 'confirmed' && booking.booking_status !== 'confirmed') {
        // Check if tickets already exist
        const ticketsResult = await client.query(
          'SELECT COUNT(*) FROM tickets WHERE booking_id = $1',
          [booking_id]
        );

        if (parseInt(ticketsResult.rows[0].count) === 0) {
          // Generate tickets
          const bookingWithDetails = await client.query(
            `SELECT b.*, e.title, u.full_name, u.email
             FROM bookings b
             JOIN events e ON b.event_id = e.id
             JOIN users u ON b.user_id = u.id
             WHERE b.id = $1`,
            [booking_id]
          );

          if (bookingWithDetails.rows.length) {
            await this.generateTickets(client, bookingWithDetails.rows[0]);
          }
        }
      }

      // Log admin action
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'UPDATE_BOOKING_STATUS',
          'bookings',
          booking_id,
          JSON.stringify({ old_status: booking.booking_status }),
          JSON.stringify({ new_status: status, notes })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Booking status updated to ${status}`,
        data: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update booking status error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update booking status' 
      });
    } finally {
      client.release();
    }
  }

  // Get System Settings
  async getSettings(req, res) {
    try {
      // In a real app, these would come from a settings table
      const defaultSettings = {
        site_name: 'Tickethub',
        site_email: 'support@tickethub.co.ke',
        site_phone: '+254700000000',
        mpesa_active: true,
        ticket_expiry_days: 30,
        booking_timeout_minutes: 15,
        enable_email_notifications: true,
        enable_sms_notifications: true,
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        maintenance_mode: false
      };

      res.json({
        success: true,
        data: defaultSettings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch settings' 
      });
    }
  }

  // Update System Settings
  async updateSettings(req, res) {
    try {
      const settings = req.body;

      // In a real app, these would be saved to a settings table
      // For now, we'll just log and return success

      // Log admin action
      await pool.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, new_values)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          'UPDATE_SETTINGS',
          'system_settings',
          JSON.stringify(settings)
        ]
      );

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update settings' 
      });
    }
  }
}

// Export individual methods for Express routing
const adminController = new AdminController();

module.exports = {
  getDashboardStats: adminController.getDashboardStats.bind(adminController),
  getAllEvents: adminController.getAllEvents.bind(adminController),
  getAllBookings: adminController.getAllBookings.bind(adminController),
  getAllPayments: adminController.getAllPayments.bind(adminController),
  approvePayment: adminController.approvePayment.bind(adminController),
  getAllUsers: adminController.getAllUsers.bind(adminController),
  updateUser: adminController.updateUser.bind(adminController),
  updateUserRole: adminController.updateUserRole.bind(adminController),
  deleteUser: adminController.deleteUser.bind(adminController),
  getRevenueReports: adminController.getRevenueReports.bind(adminController),
  validateTicket: adminController.validateTicket.bind(adminController),
  updateBookingStatus: adminController.updateBookingStatus.bind(adminController),
  getSettings: adminController.getSettings.bind(adminController),
  updateSettings: adminController.updateSettings.bind(adminController)
};