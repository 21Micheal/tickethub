// backend/src/controllers/eventController.js
const { create } = require('qrcode');
const pool = require('../config/database');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class EventController {
  async createEvent(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        title,
        description,
        venue,
        location,
        county,
        event_date,
        end_date,
        ticket_price,
        available_tickets,
        category,
        age_restriction
      } = req.body;

      // Validate dates
      if (new Date(event_date) >= new Date(end_date)) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }

      // Validate future event
      if (new Date(event_date) <= new Date()) {
        return res.status(400).json({ error: 'Event must be in the future' });
      }

      const result = await client.query(
        `INSERT INTO events 
         (title, description, venue, location, county, event_date, end_date,
          ticket_price, available_tickets, category, age_restriction, organizer_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          title,
          description,
          venue,
          location,
          county,
          event_date,
          end_date,
          ticket_price,
          available_tickets,
          category,
          age_restriction || null,
          req.user.id
        ]
      );

      // Log admin action
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'CREATE_EVENT',
          'events',
          result.rows[0].id,
          JSON.stringify({ title, venue, event_date })
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
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

      // Add ordering and pagination
      query += ` ORDER BY event_date ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(parseInt(limit), offset);

      // Get total count
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

  async uploadPoster(req, res) {
    try {
      const { id } = req.params;

      if (!req.files || !req.files.poster) {
        return res.status(400).json({ error: 'No poster file uploaded' });
      }

      const posterFile = req.files.poster;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(posterFile.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. Only JPEG/PNG allowed' });
      }

      // Validate file size (max 5MB)
      if (posterFile.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'tickethub/events',
            transformation: [
              { width: 1200, height: 800, crop: 'fill' },
              { quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(posterFile.data);
      });

      // Update event with poster URL
      await pool.query(
        'UPDATE events SET poster_url = $1 WHERE id = $2',
        [uploadResult.secure_url, id]
      );

      res.json({
        success: true,
        data: {
          poster_url: uploadResult.secure_url
        }
      });

    } catch (error) {
      console.error('Upload poster error:', error);
      res.status(500).json({ error: 'Failed to upload poster' });
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

      // Check if event exists and user is organizer
      const checkResult = await client.query(
        'SELECT organizer_id FROM events WHERE id = $1',
        [id]
      );

      if (!checkResult.rows.length) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (checkResult.rows[0].organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this event' });
      }

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (['title', 'description', 'venue', 'location', 'county', 
             'event_date', 'end_date', 'ticket_price', 'available_tickets',
             'category', 'age_restriction', 'is_published'].includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);
      const updateQuery = `
        UPDATE events 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      // Log admin action
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'UPDATE_EVENT',
          'events',
          id,
          JSON.stringify(updates)
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    } finally {
      client.release();
    }
  }

  async deleteEvent(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;

      // Check if event exists and user is organizer
      const checkResult = await client.query(
        'SELECT organizer_id, title FROM events WHERE id = $1',
        [id]
      );

      if (!checkResult.rows.length) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (checkResult.rows[0].organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this event' });
      }

      // Soft delete (mark as cancelled)
      const result = await client.query(
        'UPDATE events SET is_cancelled = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );

      // Log admin action
      await client.query(
        `INSERT INTO audit_logs 
         (admin_id, action, table_name, record_id, old_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'DELETE_EVENT',
          'events',
          id,
          JSON.stringify({ title: checkResult.rows[0].title })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Event cancelled successfully',
        data: result.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    } finally {
      client.release();
    }
  }
}

module.exports = new EventController();

module.exports = {
  createEvent: eventController.createEvent.bind(eventController),
  getEvents: eventController.getEvents.bind(eventController),
  getEventById: eventController.getEventById.bind(eventController),
  searchEvents: eventController.searchEvents.bind(eventController),
  uploadPoster: eventController.uploadPoster.bind(eventController),
  updateEvent: eventController.updateEvent.bind(eventController),
  deleteEvent: eventController.deleteEvent.bind(eventController),
};