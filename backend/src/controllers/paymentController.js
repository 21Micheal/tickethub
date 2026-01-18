// backend/src/controllers/paymentController.js
const pool = require('../config/database');
const mpesaService = require('../config/mpesa');
const QRCode = require('qrcode');

class PaymentController {
  async initiateSTKPush(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { booking_id, phone_number } = req.body;
      const user_id = req.user.id;

      // Verify booking exists and belongs to user
      const bookingResult = await client.query(
        `SELECT b.*, e.title, e.ticket_price
         FROM bookings b
         JOIN events e ON b.event_id = e.id
         WHERE b.id = $1 AND b.user_id = $2`,
        [booking_id, user_id]
      );

      if (!bookingResult.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      const booking = bookingResult.rows[0];

      // Check booking status
      if (booking.booking_status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Booking is already ${booking.booking_status}`
        });
      }

      // Check if payment already exists
      const paymentCheck = await client.query(
        'SELECT * FROM payments WHERE booking_id = $1 AND payment_status = $2',
        [booking_id, 'pending']
      );

      if (paymentCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Payment request already initiated'
        });
      }

      // Initiate M-Pesa STK Push
      const mpesaResponse = await mpesaService.stkPush(
        phone_number,
        booking.total_amount,
        booking.booking_reference,
        `Ticket purchase for ${booking.title}`
      );

      // Create payment record
      await client.query(
        `INSERT INTO payments 
         (booking_id, phone_number, amount, merchant_request_id, checkout_request_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          booking_id,
          phone_number,
          booking.total_amount,
          mpesaResponse.MerchantRequestID,
          mpesaResponse.CheckoutRequestID
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          merchant_request_id: mpesaResponse.MerchantRequestID,
          checkout_request_id: mpesaResponse.CheckoutRequestID,
          response_code: mpesaResponse.ResponseCode,
          response_description: mpesaResponse.ResponseDescription,
          customer_message: mpesaResponse.CustomerMessage,
          message: 'Payment request sent to your phone'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('STK Push error:', error);
      
      if (error.response?.data?.errorCode) {
        return res.status(400).json({
          success: false,
          error: `M-Pesa Error: ${error.response.data.errorMessage}`
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to initiate payment'
      });
    } finally {
      client.release();
    }
  }

  async mpesaCallback(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const callbackData = req.body;

      // Log the callback for debugging
      console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));

      // Parse callback data
      const stkCallback = callbackData.Body?.stkCallback;
      
      if (!stkCallback) {
        throw new Error('Invalid callback data');
      }

      const checkoutRequestID = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;
      const callbackMetadata = stkCallback.CallbackMetadata;

      if (!checkoutRequestID) {
        throw new Error('Missing CheckoutRequestID');
      }

      // Find payment by checkout request ID
      const paymentResult = await client.query(
        `SELECT p.*, b.*, e.title
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         WHERE p.checkout_request_id = $1`,
        [checkoutRequestID]
      );

      if (!paymentResult.rows.length) {
        throw new Error(`Payment not found for CheckoutRequestID: ${checkoutRequestID}`);
      }

      const payment = paymentResult.rows[0];
      const booking = paymentResult.rows[0];

      let mpesaReceiptNumber = null;
      let transactionDate = null;
      let phoneNumber = null;

      // Extract metadata if payment was successful
      if (callbackMetadata && callbackMetadata.Item) {
        callbackMetadata.Item.forEach(item => {
          if (item.Name === 'MpesaReceiptNumber') {
            mpesaReceiptNumber = item.Value;
          } else if (item.Name === 'TransactionDate') {
            transactionDate = item.Value;
          } else if (item.Name === 'PhoneNumber') {
            phoneNumber = item.Value;
          }
        });
      }

      // Update payment based on result
      const paymentStatus = resultCode === 0 ? 'successful' : 'failed';
      
      await client.query(
        `UPDATE payments 
         SET payment_status = $1,
             mpesa_receipt_number = $2,
             mpesa_transaction_id = $3,
             result_code = $4,
             result_desc = $5,
             payment_date = $6
         WHERE checkout_request_id = $7`,
        [
          paymentStatus,
          mpesaReceiptNumber,
          mpesaReceiptNumber, // Using receipt number as transaction ID
          resultCode,
          resultDesc,
          transactionDate ? new Date(transactionDate) : new Date(),
          checkoutRequestID
        ]
      );

      // If payment successful, update booking and generate tickets
      if (resultCode === 0) {
        // Update booking status (database trigger will handle inventory)
        await client.query(
          "UPDATE bookings SET booking_status = 'confirmed' WHERE id = $1",
          [payment.booking_id]
        );

        // Generate tickets
        await this.generateTickets(client, booking);
      } else {
        // Payment failed, update booking accordingly
        await client.query(
          `UPDATE bookings 
           SET booking_status = 'cancelled',
               notes = 'Payment failed: ${resultDesc}'
           WHERE id = $1`,
          [payment.booking_id]
        );
      }

      await client.query('COMMIT');

      // Send success response to M-Pesa
      res.json({
        ResultCode: 0,
        ResultDesc: "Success"
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('M-Pesa callback error:', error);
      
      // Still respond with success to M-Pesa (they'll retry)
      res.json({
        ResultCode: 0,
        ResultDesc: "Success"
      });
    } finally {
      client.release();
    }
  }

  async generateTickets(client, booking) {
    try {
      const tickets = [];
      
      // Generate unique ticket for each attendee
      for (let i = 0; i < booking.number_of_tickets; i++) {
        const ticketCode = `TKT-${booking.booking_reference}-${i + 1}`;
        
        // Create QR code data
        const qrData = JSON.stringify({
          ticketCode: ticketCode,
          event: booking.title,
          bookingReference: booking.booking_reference,
          attendee: booking.full_name || 'Ticket Holder',
          eventDate: booking.event_date,
          venue: booking.venue,
          timestamp: new Date().toISOString()
        });

        // Generate QR code
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

      console.log(`Generated ${tickets.length} tickets for booking ${booking.booking_reference}`);

    } catch (error) {
      console.error('Ticket generation error:', error);
      throw error;
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT 
          p.*,
          b.booking_reference,
          b.number_of_tickets,
          e.title as event_title,
          e.event_date
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         WHERE p.id = $1 AND b.user_id = $2`,
        [id, req.user.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      const payment = result.rows[0];

      // Format response based on payment status
      let message = '';
      switch (payment.payment_status) {
        case 'successful':
          message = 'Payment completed successfully';
          break;
        case 'pending':
          message = 'Payment request sent. Please check your phone';
          break;
        case 'failed':
          message = `Payment failed: ${payment.result_desc || 'Unknown error'}`;
          break;
        case 'cancelled':
          message = 'Payment was cancelled';
          break;
        default:
          message = 'Payment status unknown';
      }

      res.json({
        success: true,
        data: {
          ...payment,
          message: message
        }
      });

    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment status'
      });
    }
  }

  async resendPaymentRequest(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { payment_id } = req.body;
      const user_id = req.user.id;

      // Get payment details
      const paymentResult = await client.query(
        `SELECT p.*, b.*, e.title
         FROM payments p
         JOIN bookings b ON p.booking_id = b.id
         JOIN events e ON b.event_id = e.id
         WHERE p.id = $1 AND b.user_id = $2`,
        [payment_id, user_id]
      );

      if (!paymentResult.rows.length) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      const payment = paymentResult.rows[0];

      // Check if payment can be resent
      if (payment.payment_status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Cannot resend payment request. Current status: ${payment.payment_status}`
        });
      }

      // Check if previous request is still valid (within 10 minutes)
      const paymentDate = new Date(payment.payment_date);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      if (paymentDate > tenMinutesAgo) {
        return res.status(400).json({
          success: false,
          error: 'Previous payment request is still valid. Please wait 10 minutes.'
        });
      }

      // Initiate new STK Push
      const mpesaResponse = await mpesaService.stkPush(
        payment.phone_number,
        payment.amount,
        payment.booking_reference,
        `Ticket purchase for ${payment.title}`
      );

      // Update payment with new request
      await client.query(
        `UPDATE payments 
         SET merchant_request_id = $1,
             checkout_request_id = $2,
             payment_date = CURRENT_TIMESTAMP,
             result_code = NULL,
             result_desc = NULL
         WHERE id = $3`,
        [
          mpesaResponse.MerchantRequestID,
          mpesaResponse.CheckoutRequestID,
          payment_id
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          merchant_request_id: mpesaResponse.MerchantRequestID,
          checkout_request_id: mpesaResponse.CheckoutRequestID,
          message: 'Payment request resent to your phone'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Resend payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to resend payment request'
      });
    } finally {
      client.release();
    }
  }
}

// Export individual methods for Express routing
const paymentController = new PaymentController();

module.exports = {
  initiateSTKPush: paymentController.initiateSTKPush.bind(paymentController),
  mpesaCallback: paymentController.mpesaCallback.bind(paymentController),
  getPaymentStatus: paymentController.getPaymentStatus.bind(paymentController),
  resendPaymentRequest: paymentController.resendPaymentRequest.bind(paymentController)
};