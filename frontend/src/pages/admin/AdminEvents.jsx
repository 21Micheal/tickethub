// frontend/src/pages/admin/AdminEvents.jsx - RESPONSIVE VERSION
import React, { useState, useEffect } from 'react';
import { eventsAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionEventId, setActionEventId] = useState(null); // The eventId being processed (edit/delete)
  const [actionType, setActionType] = useState(null); // 'delete' | 'edit' | null

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllEvents();
      setEvents(response.data.data);
    } catch (error) {
      console.error('Fetch events error:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Provide per-item button disable/loader feedback
  const handleDelete = async (eventId) => {
    setActionEventId(eventId);
    setActionType('delete');
    try {
      const response = await eventsAPI.deleteEvent(eventId);
      toast.success(response?.data?.message || 'Event deleted successfully');
      // Optimistically remove the deleted event from UI
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
    } catch (error) {
      console.error('Delete error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(error.response?.data?.error || 'Failed to delete event');
    } finally {
      setActionEventId(null);
      setActionType(null);
    }
  };

  const handleEdit = async (eventId, updates) => {
    setActionEventId(eventId);
    setActionType('edit');
    try {
      const response = await eventsAPI.updateEvent(eventId, updates);
      toast.success(response?.data?.message || 'Event updated successfully');
      // Optimistically update the event in UI
      setEvents(prev =>
        prev.map(ev =>
          ev.id === eventId
            ? { ...ev, ...updates }
            : ev
        )
      );
    } catch (error) {
      console.error('Update error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setActionEventId(null);
      setActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
        <div className="text-lg text-gray-700">Loading events...</div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Events Management</h1>
        <button
          onClick={fetchEvents}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Refresh Events
        </button>
        <div className="text-gray-500">No events found.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Events Management</h1>
      
      <button
        onClick={fetchEvents}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        disabled={loading || actionEventId !== null}
      >
        {loading ? "Refreshing..." : "Refresh Events"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(event => (
          <div key={event.id} className={`border p-4 rounded-lg shadow relative ${actionEventId === event.id ? 'opacity-70' : ''}`}>
            <h3 className="font-bold">{event.title}</h3>
            <p>ID: {event.id}</p>
            <p>Status: {event.is_published ? 'Published' : 'Draft'}</p>
            
            <div className="mt-4 space-x-2 flex">
              <button
                onClick={() => handleEdit(event.id, { is_published: !event.is_published })}
                className={`px-3 py-1 bg-yellow-500 text-white rounded text-sm transition disabled:opacity-60`}
                disabled={actionEventId === event.id}
              >
                {(actionEventId === event.id && actionType === 'edit') ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                    Saving...
                  </span>
                ) : (
                  "Toggle Publish"
                )}
              </button>
              
              <button
                onClick={() => handleDelete(event.id)}
                className={`px-3 py-1 bg-red-500 text-white rounded text-sm transition disabled:opacity-60`}
                disabled={actionEventId === event.id}
              >
                {(actionEventId === event.id && actionType === 'delete') ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
            {event.is_cancelled && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-gray-600 text-white text-xs rounded">Cancelled</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminEvents;