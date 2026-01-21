// frontend/src/pages/admin/Events.jsx - COMPLETE VERSION WITH EDIT/DELETE (Rewritten so dropdown actions are responsive)
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminAPI, eventsAPI } from '../../services/api';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  DollarSign,
  Ticket,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import CreateEventModal from '../../components/admin/CreateEventModal';
import EditEventModal from '../../components/admin/EditEventModal';

const Events = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState({
    category: '',
    county: '',
    is_published: '',
    search: '',
    organizer_id: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null); // Full event for modals
  const [dropdownEventId, setDropdownEventId] = useState(null); // event.id only for dropdown menu
  const [actionLoading, setActionLoading] = useState(null);

  const dropdownRef = useRef(null);

  // Check for action parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      setShowCreateModal(true);
      // Clean up URL
      navigate('/admin/events', { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchEvents();
  }, [pagination.page, filters.category, filters.county, filters.is_published]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await adminAPI.getAllEvents(params);
      setEvents(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setActionLoading(eventId);

      const confirmed = window.confirm(
        'Are you sure you want to delete this event? This action cannot be undone.'
      );
      if (!confirmed) {
        setActionLoading(null);
        return;
      }

      await eventsAPI.deleteEvent(eventId);
      toast.success('Event deleted successfully');
      fetchEvents();
      setShowDeleteModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (event) => {
    try {
      setActionLoading(event.id);

      const newStatus = !event.is_published;
      await eventsAPI.updateEvent(event.id, { is_published: newStatus });

      toast.success(`Event ${newStatus ? 'published' : 'unpublished'} successfully`);
      fetchEvents();
      setDropdownEventId(null);
    } catch (error) {
      console.error('Toggle publish error:', error);
      toast.error(error.response?.data?.error || 'Failed to update event status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleCancel = async (event) => {
    try {
      setActionLoading(event.id);

      const newStatus = !event.is_cancelled;
      await eventsAPI.updateEvent(event.id, { is_cancelled: newStatus });

      toast.success(`Event ${newStatus ? 'cancelled' : 'reactivated'} successfully`);
      fetchEvents();
      setDropdownEventId(null);
    } catch (error) {
      console.error('Toggle cancel error:', error);
      toast.error(error.response?.data?.error || 'Failed to update event status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportEvents = async () => {
    try {
      toast.loading('Exporting events...');

      // In a real app, this would call a backend endpoint
      // For now, we'll create a CSV client-side
      const headers = ['Title', 'Date', 'Venue', 'County', 'Category', 'Tickets Available', 'Tickets Sold', 'Revenue', 'Status'];
      const csvData = events.map(event => [
        `"${event.title}"`,
        new Date(event.event_date).toLocaleDateString(),
        `"${event.venue}"`,
        event.county,
        event.category,
        event.available_tickets,
        event.tickets_sold || 0,
        `KES ${event.total_revenue || 0}`,
        event.is_cancelled ? 'Cancelled' : (event.is_published ? 'Published' : 'Draft')
      ]);

      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast.success('Events exported successfully');
      toast.dismiss(); // remove loading
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export events');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (event) => {
    if (event.is_cancelled) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </span>
      );
    }

    if (event.is_published) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Published
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <AlertCircle className="h-3 w-3 mr-1" />
        Draft
      </span>
    );
  };

  // Dropdown menu click outside handler
  useEffect(() => {
    if (!dropdownEventId) return;
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setDropdownEventId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [dropdownEventId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 mt-1">
            Create, edit, and manage events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportEvents}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={fetchEvents}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events by title, venue, or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
              />
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Music">Music</option>
              <option value="Technology">Technology</option>
              <option value="Food & Drink">Food & Drink</option>
              <option value="Sports">Sports</option>
              <option value="Arts & Culture">Arts & Culture</option>
              <option value="Business">Business</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={filters.county}
              onChange={(e) => handleFilterChange('county', e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            >
              <option value="">All Counties</option>
              <option value="Nairobi">Nairobi</option>
              <option value="Mombasa">Mombasa</option>
              <option value="Kisumu">Kisumu</option>
              <option value="Nakuru">Nakuru</option>
              <option value="Eldoret">Eldoret</option>
              <option value="Thika">Thika</option>
            </select>
            <select
              value={filters.is_published}
              onChange={(e) => handleFilterChange('is_published', e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid/Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-4">Create your first event or adjust your filters</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Create New Event
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Event Image */}
                <div className="relative h-48 bg-gray-200">
                  {event.poster_url ? (
                    <img
                      src={event.poster_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(event)}
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {event.title}
                    </h3>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (dropdownEventId === event.id) {
                            setDropdownEventId(null);
                          } else {
                            setDropdownEventId(event.id);
                          }
                        }}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                        aria-haspopup="menu"
                        aria-expanded={dropdownEventId === event.id}
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      {/* Dropdown Menu */}
                      {dropdownEventId === event.id && (
                        <div ref={dropdownRef} className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setShowEditModal(true);
                                setSelectedEvent(event);
                                setDropdownEventId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Event
                            </button>
                            <Link
                              to={`/events/${event.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setDropdownEventId(null)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Public Page
                            </Link>
                            <button
                              onClick={() => handleTogglePublish(event)}
                              disabled={actionLoading === event.id}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {event.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => handleToggleCancel(event)}
                              disabled={actionLoading === event.id}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {event.is_cancelled ? 'Reactivate' : 'Cancel'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEvent(event);
                                setShowDeleteModal(true);
                                setDropdownEventId(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(event.event_date)}
                      {event.end_date && ` - ${formatDate(event.end_date)}`}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.venue}, {event.county}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-gray-500 mb-1">
                          <Ticket className="h-4 w-4 mr-1" />
                          <span className="text-xs">Tickets</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {event.available_tickets}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-gray-500 mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          <span className="text-xs">Sold</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {event.tickets_sold || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-gray-500 mb-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span className="text-xs">Revenue</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {formatCurrency(event.total_revenue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium">{pagination.total}</span> events
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                        className={`px-3 py-1 mx-1 rounded-lg text-sm font-medium ${
                          pagination.page === pageNum
                            ? 'bg-red-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchEvents();
          toast.success('Event created successfully!');
        }}
      />

      <EditEventModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onSuccess={() => {
          fetchEvents();
          toast.success('Event updated successfully!');
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete Event</h2>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &quot;<span className="font-semibold">{selectedEvent.title}</span>&quot;?
                {selectedEvent.confirmed_bookings > 0 && (
                  <span className="block mt-2 text-red-600">
                    This event has {selectedEvent.confirmed_bookings} confirmed bookings.
                    The event will be marked as cancelled instead of deleted.
                  </span>
                )}
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  disabled={actionLoading === selectedEvent.id}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  {actionLoading === selectedEvent.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Event'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for dropdowns */}
      {dropdownEventId && (
        <div
          className="fixed inset-0 z-0"
          role="button"
          tabIndex={-1}
          aria-label="Close dropdown"
          onClick={() => setDropdownEventId(null)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              setDropdownEventId(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default Events;