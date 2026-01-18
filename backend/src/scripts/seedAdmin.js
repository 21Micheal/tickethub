const pool = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedAdmin = async () => {
  console.log('🛡️ Starting Production Admin Seeding...');
  
  // 1. Validate Environment Variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tickethub.co.ke';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ERROR: ADMIN_INITIAL_PASSWORD not found in environment variables.');
    console.error('Action Required: Add ADMIN_INITIAL_PASSWORD to your .env file.');
    process.exit(1);
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 2. Check if admin already exists
    const checkUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (checkUser.rows.length > 0) {
      console.log(`ℹ️ User ${adminEmail} already exists. Skipping seed.`);
      await client.query('ROLLBACK');
      process.exit(0);
    }

    // 3. Hash the password using production-standard salt rounds
    const saltRounds = 12; // Increased to 12 for production-scale security
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // 4. Insert the Admin User
    const insertQuery = `
      INSERT INTO users (
        email, 
        password_hash, 
        full_name, 
        phone_number, 
        role, 
        is_active,
        email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const values = [
      adminEmail,
      hashedPassword,
      'System Administrator',
      process.env.ADMIN_PHONE || '+254700000000',
      'admin',
      true,
      true // Auto-verify admin email
    ];

    await client.query(insertQuery, values);
    await client.query('COMMIT');

    console.log('🚀 Admin account seeded successfully.');
    console.log(`📧 Login: ${adminEmail}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding Transaction Failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    // Allow logs to flush before exiting
    setTimeout(() => process.exit(0), 500);
  }
};

seedAdmin();