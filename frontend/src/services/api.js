// frontend/src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
      window.location.href = '/login';
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
  uploadPoster: (id, file) => {
    const formData = new FormData();
    formData.append('poster', file);
    return api.post(`/events/${id}/poster`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
  getDashboardStats: () => api.get('/admin/stats'),
  getAllBookings: () => api.get('/admin/bookings'),
  getAllPayments: () => api.get('/admin/payments'),
  approvePayment: (id, action) => 
    api.put(`/admin/payments/${id}/status`, { action }),
  validateTicket: (data) => api.post('/admin/tickets/validate', data),
};

// Client API
export const clientAPI = {
  getDashboardStats: () => api.get('/client/dashboard/stats'),
  // Add more client-specific endpoints as needed
};

export default api;