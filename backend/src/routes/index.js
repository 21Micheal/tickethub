// backend/src/routes/index.js - UPDATED
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');

// Import controllers with method binding
const authController = require('../controllers/authController');
const eventController = require('../controllers/eventController');
const bookingController = require('../controllers/bookingController');
const adminController = require('../controllers/adminController');
const paymentController = require('../controllers/paymentController');

// Authentication Routes
router.post('/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty().trim(),
  body('phone_number').isMobilePhone('any')
], authController.register);

router.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

router.get('/auth/me', authenticate, authController.getCurrentUser);

// Event Routes (Public)
router.get('/events', eventController.getEvents);
router.get('/events/:id', eventController.getEventById);
router.get('/events/search', eventController.searchEvents);

// Event Routes (Admin only)
router.post('/events', authenticate, authorize('admin'), eventController.createEvent);
router.put('/events/:id', authenticate, authorize('admin'), eventController.updateEvent);
router.delete('/events/:id', authenticate, authorize('admin'), eventController.deleteEvent);
router.post('/events/:id/poster', authenticate, authorize('admin'), eventController.uploadPoster);

// Booking Routes (Authenticated users)
router.post('/bookings', authenticate, authorize('client'), bookingController.createBooking);
router.get('/bookings', authenticate, bookingController.getUserBookings);
router.get('/bookings/:id', authenticate, bookingController.getBookingById);
router.put('/bookings/:id/cancel', authenticate, bookingController.cancelBooking);

// Payment Routes
router.post('/payments/mpesa/stk-push', authenticate, paymentController.initiateSTKPush);
router.post('/payments/mpesa/callback', paymentController.mpesaCallback);
router.get('/payments/:id', authenticate, paymentController.getPaymentStatus);
router.post('/payments/resend', authenticate, paymentController.resendPaymentRequest);

// Admin Routes
router.get('/admin/bookings', authenticate, authorize('admin'), adminController.getAllBookings);
router.get('/admin/payments', authenticate, authorize('admin'), adminController.getAllPayments);
router.put('/admin/payments/:id/status', authenticate, authorize('admin'), adminController.approvePayment);
router.get('/admin/stats', authenticate, authorize('admin'), adminController.getDashboardStats);
router.get('/admin/revenue', authenticate, authorize('admin'), adminController.getRevenueReports);
router.get('/admin/events', authenticate, authorize('admin'), adminController.getAllEvents);


// Ticket Routes
router.get('/tickets', authenticate, bookingController.getUserTickets);
router.get('/tickets/:id', authenticate, bookingController.getTicketById);
router.get('/tickets/:id/qr', authenticate, bookingController.getTicketQR);
router.post('/admin/tickets/validate', authenticate, authorize('admin'), adminController.validateTicket);

// User Management Routes
router.get('/admin/users', authenticate, authorize('admin'), adminController.getAllUsers);
router.put('/admin/users/:id', authenticate, authorize('admin'), adminController.updateUser);
router.put('/admin/users/:id/role', authenticate, authorize('admin'), adminController.updateUserRole);
router.delete('/admin/users/:id', authenticate, authorize('admin'), adminController.deleteUser);

// Settings Routes
router.get('/admin/settings', authenticate, authorize('admin'), adminController.getSettings);
router.put('/admin/settings', authenticate, authorize('admin'), adminController.updateSettings);

module.exports = router;