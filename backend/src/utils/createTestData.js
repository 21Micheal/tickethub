// backend/src/utils/createTestData.js
const pool = require('../config/database');

async function createTestPayment() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get admin and client users
    const adminResult = await client.query(
      "SELECT id FROM users WHERE email = 'admin@tickethub.co.ke'"
    );
    const clientResult = await client.query(
      "SELECT id FROM users WHERE email = 'client@example.com'"
    );
    const eventResult = await client.query(
      "SELECT id, ticket_price FROM events LIMIT 1"
    );

    if (!adminResult.rows.length || !clientResult.rows.length || !eventResult.rows.length) {
      console.log('Required data not found');
      return;
    }

    const adminId = adminResult.rows[0].id;
    const clientId = clientResult.rows[0].id;
    const event = eventResult.rows[0];

    // Create a booking
    const bookingResult = await client.query(
      `INSERT INTO bookings 
       (user_id, event_id, number_of_tickets, phone_number, booking_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, booking_reference`,
      [clientId, event.id, 2, '+254712345678', 'pending']
    );

    const booking = bookingResult.rows[0];

    // Create a payment
    const amount = event.ticket_price * 2;
    const paymentResult = await client.query(
      `INSERT INTO payments 
       (booking_id, phone_number, amount, payment_status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [booking.id, '+254712345678', amount, 'pending']
    );

    await client.query('COMMIT');

    console.log('✅ Test payment created successfully!');
    console.log(`📋 Booking Reference: ${booking.booking_reference}`);
    console.log(`💰 Payment ID: ${paymentResult.rows[0].id}`);
    console.log(`💵 Amount: KES ${amount}`);
    console.log('\nUse this payment ID to test the approve payment endpoint.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test payment:', error);
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  createTestPayment()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = createTestPayment;
