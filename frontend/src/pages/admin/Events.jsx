// frontend/src/pages/admin/Events.jsx
import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../../services/api';
import { Plus, Edit, Trash2, Eye, Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getAllEvents();
      setEvents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await eventsAPI.deleteEvent(selectedEvent.id);
      toast.success('Event deleted successfully');
      fetchEvents();
      setShowDeleteModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete event');
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

  const getStatusBadge = (event) => {
    if (event.is_cancelled) {
      return <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">Cancelled</span>;
    }
    if (!event.is_published) {
      return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">Draft</span>;
    }
    if (new Date(event.event_date) < new Date()) {
      return <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">Past</span>;
    }
    return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Active</span>;
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
          <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-600 mt-2">Create and manage all events on Tickethub</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create New Event
        </button>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden">
                        <img 
                          src={event.poster_url || '/default-event.jpg'} 
                          alt={event.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500">{event.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(event.event_date)}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {event.county}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.sold_tickets || 0} / {event.available_tickets + (event.sold_tickets || 0)}
                      </div>
                      <div className="text-gray-900 font-medium mt-1">
                        {formatCurrency(event.ticket_price)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">
                        {formatCurrency((event.sold_tickets || 0) * event.ticket_price)}
                      </div>
                      <div className="text-gray-500">Total Revenue</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(event)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Link
                        to={`/events/${event.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => {
                          // Navigate to edit or open edit modal
                          toast.info('Edit feature coming soon');
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <Trash2 className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;{selectedEvent.title}&quot;? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;