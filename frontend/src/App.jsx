// frontend/src/App.jsx - FIXED VERSION
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Layout from './components/layout/Layout';
//import AdminLayout from './components/layout/AdminLayout'; // You might need to create this
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/public/Home';
import Events from './pages/public/Events';
import EventDetail from './pages/public/EventDetail';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// Client Pages
import Dashboard from './pages/client/Dashboard';
import Bookings from './pages/client/Bookings';
import Tickets from './pages/client/Tickets';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminEvents from './pages/admin/Events';
import AdminBookings from './pages/admin/Bookings';
import AdminPayments from './pages/admin/Payments';
import Reports from './pages/admin/Reports';
import ValidateTickets from './pages/admin/ValidateTickets';
import AdminUsers from './pages/admin/Users';
import Settings from './pages/admin/Settings';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes with Main Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          {/* Client Routes with Main Layout */}
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['client']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="bookings" element={
              <ProtectedRoute allowedRoles={['client']}>
                <Bookings />
              </ProtectedRoute>
            } />
            <Route path="tickets" element={
              <ProtectedRoute allowedRoles={['client']}>
                <Tickets />
              </ProtectedRoute>
            } />
          </Route>

          {/* Admin Routes with separate layout */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              {/* If you have AdminLayout, use it here, otherwise use Layout */}
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<Settings />} />
            <Route path="revenue" element={<Reports />} />
            <Route path="tickets/validate" element={<ValidateTickets />} />
          </Route>
          
          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;