// backend/src/controllers/eventController.js
const { create } = require('qrcode');
const pool = require('../config/database');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// --- Cloudinary config fix: Only configure once and log config ---
if (
  !cloudinary.configuredProperly ||
  !cloudinary.configuredAt ||
  Date.now() - (cloudinary.configuredAt || 0) > 1000 * 60 * 5 // Refresh every 5min
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // explicit, for signature
  });
  cloudinary.configuredProperly = true;
  cloudinary.configuredAt = Date.now();
  // DEBUG: config dump (do not log secret in production)
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret_exists: !!process.env.CLOUDINARY_API_SECRET
    });
  }
}

class EventController {

  // Configure multer for file uploads (INSIDE THE CLASS)
  configureMulter() {
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/temp');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'poster-' + uniqueSuffix + ext);
      }
    });

    return multer({ 
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      }
    });
  }

  async createEvent(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const {
        title, description, venue, location, county,
        event_date, end_date, ticket_price, available_tickets,
        category, age_restriction, is_published = false
      } = req.body;

      const organizer_id = req.user?.id;
      if (!organizer_id) {
        throw new Error('User not authenticated');
      }

      if (!title || !description || !venue || !location || !event_date || !ticket_price) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const result = await client.query(
        `INSERT INTO events 
         (title, description, venue, location, county, event_date, end_date,
          ticket_price, available_tickets, category, age_restriction, organizer_id, is_published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          title, description, venue, location, county,
          event_date, end_date, ticket_price, available_tickets,
          category, age_restriction || null, organizer_id, is_published
        ]
      );

      try {
        await client.query(
          `INSERT INTO audit_logs (admin_id, action, table_name, record_id, new_values)
           VALUES ($1, 'CREATE_EVENT', 'events', $2, $3)`,
          [req.user.id, result.rows[0].id, JSON.stringify({ title, event_date })]
        );
      } catch (auditErr) {
        console.warn('Audit log failed, but event created:', auditErr.message);
      }

      await client.query('COMMIT');
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create event error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'Event already exists' });
      }
      res.status(500).json({ success: false, error: error.message || 'Failed to create event' });
    } finally {
      client.release();
    }
  }

  async getEvents(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        county,
        date_from,
        date_to,
        search 
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT * FROM events 
        WHERE is_published = true 
        AND is_cancelled = false
        AND event_date > NOW()
      `;
      
      const values = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount}`;
        values.push(category);
        paramCount++;
      }

      if (county) {
        query += ` AND county = $${paramCount}`;
        values.push(county);
        paramCount++;
      }

      if (date_from) {
        query += ` AND event_date >= $${paramCount}`;
        values.push(date_from);
        paramCount++;
      }

      if (date_to) {
        query += ` AND event_date <= $${paramCount}`;
        values.push(date_to);
        paramCount++;
      }

      if (search) {
        query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        values.push(`%${search}%`);
        paramCount++;
      }

      query += ` ORDER BY event_date ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(parseInt(limit), offset);

      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)').split('ORDER BY')[0];
      const countResult = await pool.query(countQuery, values.slice(0, -2));
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
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  // backend/src/controllers/eventController.js

  // Temporarily disable Cloudinary and use local storage
    // backend/src/controllers/eventController.js - FIXED UPLOAD HANDLER
    async uploadPoster(req, res) {
      console.log('Upload poster endpoint called - Cloudinary version');
    
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }
    
      const { id } = req.params;
    
      if (!id || id === 'undefined') {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing event ID'
        });
      }
    
      console.log('Processing poster upload for event ID:', id);
      console.log('File:', req.file.originalname, req.file.mimetype, req.file.size);
    
      try {
        // Verify event exists (you can keep your existing query)
        const eventResult = await pool.query(
          'SELECT id FROM events WHERE id = $1',
          [id]
        );
    
        if (!eventResult.rows.length) {
          return res.status(404).json({
            success: false,
            error: 'Event not found'
          });
        }
    
        let uploadResult;
    
        // ────────────────────────────────────────────────
        // Handle memory storage (recommended for Cloudinary)
        // ────────────────────────────────────────────────
        if (req.file.buffer) {
          // Use data URI approach (very reliable)
          const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
          uploadResult = await cloudinary.uploader.upload(dataUri, {
            folder: 'events/posters',
            public_id: `event_${id.replace(/-/g, '_')}_${Date.now()}`, // avoid dashes in public_id
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
              { width: 1200, height: 800, crop: 'limit' }
            ]
          });
        } 
        // Fallback for disk storage (if you ever switch back)
        else if (req.file.path) {
          uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'events/posters',
                public_id: `event_${id.replace(/-/g, '_')}_${Date.now()}`,
                resource_type: 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
                transformation: [
                  { quality: 'auto:good' },
                  { fetch_format: 'auto' },
                  { width: 1200, height: 800, crop: 'limit' }
                ]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
    
            fs.createReadStream(req.file.path).pipe(uploadStream);
          });
    
          // Clean up temp file
          fs.unlink(req.file.path, (err) => {
            if (err) console.warn('Could not delete temp file:', err);
          });
        } 
        else {
          throw new Error('No file buffer or path available from Multer');
        }
    
        console.log('Cloudinary upload successful:', uploadResult.public_id);
    
        const posterUrl = uploadResult.secure_url;
    
        // Update database
        await pool.query(
          'UPDATE events SET poster_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [posterUrl, id]
        );
    
        res.json({
          success: true,
          message: 'Poster uploaded successfully to Cloudinary',
          data: {
            poster_url: posterUrl,
            public_id: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format
          }
        });
    
      } catch (error) {
        console.error('Cloudinary upload error:', error);
    
        // If using disk storage and error occurred → try cleanup
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }
    
        res.status(500).json({
          success: false,
          error: 'Failed to upload poster: ' + (error.message || 'Unknown error')
        });
      }
    }

  async getEventById(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT e.*, 
                u.full_name as organizer_name,
                u.email as organizer_email
         FROM events e
         LEFT JOIN users u ON e.organizer_id = u.id
         WHERE e.id = $1 
         AND e.is_published = true 
         AND e.is_cancelled = false`,
        [id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Event not found' });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Get event by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  }

  async searchEvents(req, res) {
    try {
      const { q, category, county, date_from, date_to } = req.query;

      let query = `
        SELECT * FROM events 
        WHERE is_published = true 
        AND is_cancelled = false
        AND event_date > NOW()
      `;
      
      const values = [];
      let paramCount = 1;

      if (q) {
        query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        values.push(`%${q}%`);
        paramCount++;
      }

      if (category) {
        query += ` AND category = $${paramCount}`;
        values.push(category);
        paramCount++;
      }

      if (county) {
        query += ` AND county = $${paramCount}`;
        values.push(county);
        paramCount++;
      }

      if (date_from) {
        query += ` AND event_date >= $${paramCount}`;
        values.push(date_from);
        paramCount++;
      }

      if (date_to) {
        query += ` AND event_date <= $${paramCount}`;
        values.push(date_to);
        paramCount++;
      }

      query += ' ORDER BY event_date ASC LIMIT 20';

      const result = await pool.query(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Search events error:', error);
      res.status(500).json({ error: 'Failed to search events' });
    }
  }

  async updateEvent(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const updates = req.body;

      const eventResult = await client.query(
        'SELECT * FROM events WHERE id = $1',
        [id]
      );

      if (!eventResult.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      const bookingsResult = await client.query(
        'SELECT COUNT(*) FROM bookings WHERE event_id = $1 AND booking_status = $2',
        [id, 'confirmed']
      );
      const hasConfirmedBookings = parseInt(bookingsResult.rows[0].count) > 0;

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (hasConfirmedBookings) {
          if (key === 'ticket_price') {
            return;
          }
          if (key === 'available_tickets') {
            const currentTickets = eventResult.rows[0].available_tickets;
            const newTickets = parseInt(updates[key]);
            if (newTickets < currentTickets) {
              return;
            }
          }
        }

        if ([
          'title', 'description', 'venue', 'location', 'county',
          'event_date', 'end_date', 'ticket_price', 'available_tickets',
          'category', 'age_restriction', 'is_published', 'is_cancelled'
        ].includes(key)) {
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
        UPDATE events 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, old_values, new_values)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'UPDATE_EVENT',
          'events',
          id,
          JSON.stringify(eventResult.rows[0]),
          JSON.stringify(updates)
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update event error:', error);

      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'An event with similar details already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update event'
        });
      }
    } finally {
      client.release();
    }
  }

  // Delete Event
  async deleteEvent(req, res) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const { id } = req.params;

      const eventResult = await client.query(
        'SELECT * FROM events WHERE id = $1',
        [id]
      );

      if (!eventResult.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Event not found'
        });
      }

      const event = eventResult.rows[0];

      const bookingsResult = await client.query(
        'SELECT COUNT(*) FROM bookings WHERE event_id = $1',
        [id]
      );

      const hasBookings = parseInt(bookingsResult.rows[0].count) > 0;

      if (hasBookings) {
        await client.query(
          `UPDATE events 
           SET is_cancelled = true, 
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );

        await client.query(
          `INSERT INTO audit_logs 
           (admin_id, action, table_name, record_id, old_values)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.id,
            'CANCEL_EVENT',
            'events',
            id,
            JSON.stringify({
              title: event.title,
              reason: 'Event has bookings, marked as cancelled instead of deleted'
            })
          ]
        );

        await client.query('COMMIT');

        return res.json({
          success: true,
          message: 'Event cancelled successfully (event has bookings)'
        });
      }

      await client.query('DELETE FROM events WHERE id = $1', [id]);

      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, old_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'DELETE_EVENT',
          'events',
          id,
          JSON.stringify({
            title: event.title,
            event_date: event.event_date
          })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete event'
      });
    } finally {
      client.release();
    }
  }
}

const eventController = new EventController();

module.exports = {
  createEvent: eventController.createEvent.bind(eventController),
  getEvents: eventController.getEvents.bind(eventController),
  getEventById: eventController.getEventById.bind(eventController),
  searchEvents: eventController.searchEvents.bind(eventController),
  uploadPoster: eventController.uploadPoster.bind(eventController),
  updateEvent: eventController.updateEvent.bind(eventController),
  deleteEvent: eventController.deleteEvent.bind(eventController),
};