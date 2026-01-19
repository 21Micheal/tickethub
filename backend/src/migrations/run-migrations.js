// backend/src/migrations/run-migrations.js
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting database migrations...');
    
    // Read and execute migration files in order
    const migrationsDir = path.join(__dirname, '../../sql');
    const migrationFiles = [
      'migration_002_create_settings.sql'
    ];
    
    for (const migrationFile of migrationFiles) {
      const filePath = path.join(migrationsDir, migrationFile);
      
      if (fs.existsSync(filePath)) {
        console.log(`Running migration: ${migrationFile}`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✓ ${migrationFile} completed`);
      } else {
        console.log(`⚠ ${migrationFile} not found, skipping`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = runMigrations;