// backend/src/controllers/authController.js
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class AuthController {
  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { email, password, full_name, phone_number } = req.body;

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
        [email, phone_number]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ 
          error: 'User with this email or phone number already exists' 
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create user (default role: client)
      const result = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone_number, role)
         VALUES ($1, $2, $3, $4, 'client')
         RETURNING id, email, full_name, phone_number, role, created_at`,
        [email, passwordHash, full_name, phone_number]
      );

      // Generate JWT
      const token = jwt.sign(
        { userId: result.rows[0].id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Update last login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          token,
          user: result.rows[0]
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    } finally {
      client.release();
    }
  }

  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // Find user
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (!result.rows.length) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Update last login
      await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          token,
          user: userWithoutPassword
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, email, full_name, phone_number, role, created_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
}

const authController = new AuthController();

module.exports = {
  register: authController.register.bind(authController),
  login: authController.login.bind(authController),
  getCurrentUser: authController.getCurrentUser.bind(authController),
};