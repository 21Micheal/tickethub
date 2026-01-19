// frontend/src/pages/client/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI, eventsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Calendar, CreditCard, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingEvents: 0,
    pendingPayments: 0,
    totalSpent: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [bookingsRes, eventsRes] = await Promise.all([
        bookingsAPI.getUserBookings(),
        eventsAPI.getEvents({ page: 1, limit: 3 })
      ]);

      const bookings = bookingsRes.data.data || [];
      const events = eventsRes.data.data || [];

      // Calculate stats
      const totalBookings = bookings.length;
      const upcomingEvents = events.length;
      const pendingPayments = bookings.filter(b => 
        b.booking_status === 'pending' || b.payment_status === 'pending'
      ).length;
      const totalSpent = bookings
        .filter(b => b.booking_status === 'confirmed')
        .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

      setStats({
        totalBookings,
        upcomingEvents,
        pendingPayments,
        totalSpent
      });

      setRecentBookings(bookings.slice(0, 5));
      setUpcomingEvents(events);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-8 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.full_name}!</h1>
        <p className="text-red-100">Here&apos;s what&apos;s happening with your tickets</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalBookings}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Ticket className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Upcoming Events</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.upcomingEvents}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingPayments}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/bookings" className="text-red-600 hover:text-red-700 font-medium">
              View all
            </Link>
          </div>
          
          {recentBookings.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No bookings yet</p>
              <Link 
                to="/events" 
                className="inline-block mt-4 text-red-600 hover:text-red-700 font-medium"
              >
                Browse events
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map(booking => (
                <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{booking.title}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(booking.event_date)}
                      </span>
                      <span>{formatCurrency(booking.total_amount)}</span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(booking.booking_status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/events" className="text-red-600 hover:text-red-700 font-medium">
              View all
            </Link>
          </div>
          
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map(event => (
                <Link 
                  key={event.id} 
                  to={`/events/${event.id}`}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 group"
                >
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                    <img 
                      src={event.poster_url || '/default-event.jpg'} 
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="ml-4 flex-grow">
                    <p className="font-medium text-gray-900 group-hover:text-red-600">{event.title}</p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(event.event_date)}
                      </span>
                      <span>{event.venue}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {formatCurrency(event.ticket_price)}
                    </p>
                    <p className="text-xs text-gray-500">{event.available_tickets} left</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            to="/events" 
            className="bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-medium text-center transition-colors"
          >
            Browse Events
          </Link>
          <Link 
            to="/bookings" 
            className="bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 py-4 px-6 rounded-lg font-medium text-center transition-colors"
          >
            View My Bookings
          </Link>
          <Link 
            to="/tickets" 
            className="bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-4 px-6 rounded-lg font-medium text-center transition-colors"
          >
            My Tickets
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;