// frontend/src/services/api.js
import axios from 'axios';

// Determine API URL based on environment
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'; // Using import.meta.env for Vite

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // IMPORTANT: If the request data is a FormData instance,
    // remove the 'Content-Type' header so Axios can automatically
    // set it to 'multipart/form-data' with the correct boundary.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      // Use window.location.replace to prevent going back to the protected page
      window.location.replace('/login'); 
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// Events API
export const eventsAPI = {
  getEvents: (params) => api.get('/events', { params }),
  getEventById: (id) => api.get(`/events/${id}`),
  searchEvents: (params) => api.get('/events/search', { params }),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  // No need to explicitly set 'Content-Type' here, the interceptor handles it
  uploadPoster: (id, file) => {
    const formData = new FormData();
    formData.append('poster', file);
    return api.post(`/events/${id}/poster`, formData);
  },
};

// Bookings API
export const bookingsAPI = {
  createBooking: (data) => api.post('/bookings', data),
  getUserBookings: () => api.get('/bookings'),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  cancelBooking: (id) => api.put(`/bookings/${id}/cancel`),
  getUserTickets: () => api.get('/tickets'),
  getTicketQR: (id) => api.get(`/tickets/${id}/qr`),
};

// Payments API
export const paymentsAPI = {
  initiateSTKPush: (data) => api.post('/payments/mpesa/stk-push', data),
  getPaymentStatus: (id) => api.get(`/payments/${id}`),
};

// Admin API
export const adminAPI = {
  // Dashboard & Stats
  getDashboardStats: () => api.get('/admin/stats'),
  getRevenueReports: (params) => api.get('/admin/revenue', { params }),
  // Events Management
  getAllEvents: (params) => api.get('/admin/events', { params }),
  // Bookings Management
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  updateBookingStatus: (bookingId, data) => api.put(`/admin/bookings/${bookingId}/status`, data),
  // Payments Management
  getAllPayments: (params) => api.get('/admin/payments', { params }),
  approvePayment: (paymentId, data) => api.put(`/admin/payments/${paymentId}/status`, data),
  // Users Management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  updateUserRole: (userId, data) => api.put(`/admin/users/${userId}/role`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  // Ticket Validation
  validateTicket: (data) => api.post('/admin/tickets/validate', data),
  // Settings Management
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
};

// Client API
export const clientAPI = {
  getDashboardStats: () => api.get('/client/dashboard/stats'),
  // Add more client-specific endpoints as needed
};

export default api;