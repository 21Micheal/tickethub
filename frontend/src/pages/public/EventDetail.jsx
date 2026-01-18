// frontend/src/pages/EventDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, bookingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Calendar, MapPin, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingTickets, setBookingTickets] = useState(1);
  const [bookingPhone, setBookingPhone] = useState(user?.phone_number || '');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getEventById(id);
      setEvent(response.data.data);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/login');
      return;
    }

    if (!bookingPhone.match(/^\+254[0-9]{9}$/)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., +2547XXXXXXXX)');
      return;
    }

    try {
      setBookingLoading(true);
      const bookingData = {
        event_id: id,
        number_of_tickets: bookingTickets,
        phone_number: bookingPhone
      };

      const response = await bookingsAPI.createBooking(bookingData);
      
      toast.success('M-Pesa payment request sent to your phone!');
      
      // Redirect to bookings page
      navigate('/bookings');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.error || 'Failed to process booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
        <p className="text-gray-600">
          The event you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'EEEE, MMMM do, yyyy • h:mm a');
  };

  const formatEndTime = (dateString) => {
    return format(new Date(dateString), 'h:mm a');
  };

  return (
    <div className="space-y-8">
      {/* Event Header */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="relative h-64 md:h-96">
          <img
            src={event.poster_url || '/default-event.jpg'}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{event.title}</h1>
            <div className="flex items-center space-x-4 text-lg">
              <span className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                {formatDate(event.event_date)}
              </span>
              <span className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                {event.venue}, {event.county}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
            <div className="prose max-w-none text-gray-700">
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Date &amp; Time</h3>
                    <p className="text-gray-600">{formatDate(event.event_date)}</p>
                    <p className="text-sm text-gray-500">Duration: {formatEndTime(event.end_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Location</h3>
                    <p className="text-gray-600">{event.venue}</p>
                    <p className="text-gray-600">{event.location}, {event.county} County</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Tickets</h3>
                    <p className="text-gray-600">
                      {event.available_tickets} tickets available
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.sold_tickets || 0} tickets already sold
                    </p>
                  </div>
                </div>
                
                {event.age_restriction && (
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-gray-500 mr-3 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Age Restriction</h3>
                      <p className="text-gray-600">Ages {event.age_restriction}+ only</p>
                    </div>
                  </div>
                )}
                
                {event.category && (
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-gray-500 mr-3 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Category</h3>
                      <p className="text-gray-600">{event.category}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Panel */}
        <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {formatCurrency(event.ticket_price)}
              </h3>
              <p className="text-gray-600">per ticket</p>
            </div>

            <div>
              <label htmlFor="ticket-quantity" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Tickets
              </label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setBookingTickets(t => Math.max(1, t - 1))}
                  disabled={bookingTickets <= 1}
                  className="h-10 w-10 rounded-lg border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  aria-label="Decrease ticket quantity"
                  type="button"
                >
                  −
                </button>
                <span id="ticket-quantity" className="text-2xl font-bold">
                  {bookingTickets}
                </span>
                <button
                  onClick={() => setBookingTickets(t => Math.min(event.available_tickets, t + 1))}
                  disabled={bookingTickets >= event.available_tickets}
                  className="h-10 w-10 rounded-lg border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  aria-label="Increase ticket quantity"
                  type="button"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {event.available_tickets} tickets available
              </p>
            </div>

            <div>
              <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-2">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                id="phone-number"
                value={bookingPhone}
                onChange={(e) => setBookingPhone(e.target.value)}
                placeholder="+2547XXXXXXXX"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                We&apos;ll send the payment request to this number
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Ticket Price</span>
                <span className="font-medium">{formatCurrency(event.ticket_price)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium">{bookingTickets}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total Amount</span>
                <span className="text-red-600">
                  {formatCurrency(event.ticket_price * bookingTickets)}
                </span>
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={bookingLoading || event.available_tickets === 0 || !bookingPhone}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center"
              type="button"
            >
              {bookingLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : event.available_tickets === 0 ? (
                'Sold Out'
              ) : (
                'Book with M-Pesa'
              )}
            </button>

            <div className="text-center text-sm text-gray-500">
              <p>You&apos;ll receive an STK Push on your phone to complete payment</p>
              <p className="mt-1">Payment secured by Safaricom M-Pesa</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;