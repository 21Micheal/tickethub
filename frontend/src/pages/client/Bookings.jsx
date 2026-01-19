// frontend/src/pages/client/Bookings.jsx
import React, { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import { Calendar, MapPin, Users, CreditCard, Download, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getUserBookings();
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setCancellingId(bookingId);
      await bookingsAPI.cancelBooking(bookingId);
      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh list
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return booking.booking_status === 'confirmed' && 
             new Date(booking.event_date) > new Date();
    }
    if (filter === 'pending') {
      return booking.booking_status === 'pending';
    }
    if (filter === 'past') {
      return new Date(booking.event_date) < new Date();
    }
    return true;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy • h:mm a');
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">View and manage all your ticket bookings</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'past' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
          <p className="text-gray-600 mb-6">Start by browsing events and booking tickets</p>
          <a 
            href="/events" 
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Events
          </a>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No {filter} bookings</h3>
          <p className="text-gray-600">Try selecting a different filter</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBookings.map(booking => {
            const isUpcoming = new Date(booking.event_date) > new Date();
            const canCancel = booking.booking_status === 'pending' || 
                            (booking.booking_status === 'confirmed' && isUpcoming);

            return (
              <div key={booking.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    {/* Event Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                          <img 
                            src={booking.poster_url || '/default-event.jpg'} 
                            alt={booking.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{booking.title}</h3>
                          <div className="space-y-2 text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(booking.event_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{booking.venue}, {booking.county}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{booking.number_of_tickets} ticket{booking.number_of_tickets > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="md:text-right space-y-4">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(booking.total_amount)}
                        </p>
                        <p className="text-sm text-gray-500">Total paid</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Booking Reference</p>
                        <p className="font-mono font-medium">{booking.booking_reference}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <div className="mt-1">{getStatusBadge(booking.booking_status)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status */}
                  {booking.payment_status && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">Payment Status:</span>
                          <span className={`font-medium ${
                            booking.payment_status === 'successful' ? 'text-green-600' :
                            booking.payment_status === 'pending' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {booking.payment_status}
                          </span>
                        </div>
                        {booking.mpesa_receipt_number && (
                          <span className="text-sm text-gray-600">
                            Receipt: {booking.mpesa_receipt_number}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {booking.booking_status === 'confirmed' && (
                      <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                        <Download className="h-4 w-4" />
                        Download Tickets
                      </button>
                    )}
                    
                    {canCancel && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingId === booking.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Cancel Booking
                          </>
                        )}
                      </button>
                    )}
                    
                    <a 
                      href={`/events/${booking.event_id}`}
                      className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Event
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bookings;