// frontend/src/components/admin/CreateEventModal.jsx - COMPLETED WITH API CALL
import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { KENYAN_COUNTIES } from '../../constants/counties';
import { eventsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CreateEventModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    location: '',
    county: 'Nairobi',
    event_date: '',
    end_date: '',
    ticket_price: '',
    available_tickets: '',
    category: '',
    age_restriction: '',
    is_published: true
  });
  const [posterFile, setPosterFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const categories = [
    'Music', 'Technology', 'Food & Drink', 'Sports', 'Arts & Culture',
    'Business', 'Education', 'Health & Wellness', 'Family', 'Other'
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      setPosterFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadPoster = async (eventId, file) => {

    if (!eventId || !file) {

        // Reject with a specific message if eventId or file are missing

        return Promise.reject(new Error('Event ID or file missing for poster upload.'));

    }

    try {

      const response = await eventsAPI.uploadPoster(eventId, file);

      return response.data;

    } catch (error) {

      let errorMessage = 'Unknown error during poster upload.';

      

      // More robust check for network errors (e.g., backend not running, CORS issues)

      if (error.code === 'ERR_NETWORK') {

        errorMessage = 'Network error during poster upload. Check your internet connection and if the backend is running and accessible.';

        console.error('Network error - check if backend "uploads" folder exists and is properly configured:', error);

      } else if (error.response) {

        // Server responded with a status other than 2xx

        errorMessage = error.response.data?.error || `Server error: ${error.response.status} - ${error.response.statusText}`;

        console.error('Poster upload server error details:', error.response.data);

      } else if (error.request) {

        // Request was made but no response was received

        errorMessage = 'No response received from server for poster upload.';

        console.error('Poster upload request error:', error.request);

      } else {

        // Something else happened in setting up the request

        errorMessage = `Error setting up poster upload request: ${error.message}`;

        console.error('Poster upload client-side error:', error.message);

      }

      

      // Instead of throwing the raw error object, reject with a new Error containing the user-friendly message.

      // toast.promise can then use this message directly for the 'error' state.

      return Promise.reject(new Error(errorMessage));

    }

  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate dates
      const eventDate = new Date(formData.event_date);
      const endDate = new Date(formData.end_date);
      
      if (eventDate >= endDate) {
        toast.error('End date must be after start date');
        return;
      }
      
      if (eventDate < new Date()) {
        toast.error('Start date cannot be in the past');
        return;
      }
      
      // Prepare event data
      const eventData = {
        ...formData,
        ticket_price: parseFloat(formData.ticket_price),
        available_tickets: parseInt(formData.available_tickets),
        age_restriction: formData.age_restriction ? parseInt(formData.age_restriction) : null,
        is_published: formData.is_published
      };
  
      console.log('Creating event with data:', eventData);
  
      // Create the event
      const createResponse = await eventsAPI.createEvent(eventData);
      const eventId = createResponse.data.data.id;
      
      console.log('Event created with ID:', eventId);
  
      // If there's a poster file, upload it
      if (posterFile) {
        try {
          console.log('Uploading poster file:', posterFile);
          console.log("File name:", posterFile.name);

          console.log("File size:", posterFile.size); // Check this value!

          console.log("File type:", posterFile.type);
          
          await toast.promise(
            eventsAPI.uploadPoster(eventId, posterFile),
            {
              loading: 'Uploading event poster...',
              success: (response) => {
                console.log('Poster upload success:', response.data);
                return 'Event created with poster!';
              },
              error: (error) => {
                console.error('Poster upload error:', {
                  status: error.response?.status,
                  data: error.response?.data,
                  message: error.message
                });
                
                // Event was created but poster upload failed
                return error.response?.data?.error || 'Poster upload failed. Event created without poster.';
              }
            }
          );
        } catch (uploadError) {
          // Continue even if poster upload fails
          console.error('Poster upload catch error:', uploadError);
        }
      } else {
        toast.success('Event created successfully!');
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(eventId);
      }
      
      // Reset form
      resetForm();
      onClose();
      
    } catch (error) {
      console.error('Create event error:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.error || error.response.data.message;
        toast.error(`Validation error: ${errorMessage}`);
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to create events');
      } else if (error.response?.status === 409) {
        toast.error('An event with similar details already exists');
      } else {
        toast.error(error.response?.data?.error || 'Failed to create event. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      venue: '',
      location: '',
      county: 'Nairobi',
      event_date: '',
      end_date: '',
      ticket_price: '',
      available_tickets: '',
      category: '',
      age_restriction: '',
      is_published: true
    });
    setPosterFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Event Details */}
            <div className="space-y-6">
              <div>
                <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  id="event-title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={255}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="event-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={4}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Describe your event in detail..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-start" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="event-start"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="event-end" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    id="event-end"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-ticket-price" className="block text-sm font-medium text-gray-700 mb-2">
                    Ticket Price (KES) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      KES
                    </span>
                    <input
                      type="number"
                      id="event-ticket-price"
                      name="ticket_price"
                      value={formData.ticket_price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="event-available-tickets" className="block text-sm font-medium text-gray-700 mb-2">
                    Available Tickets *
                  </label>
                  <input
                    type="number"
                    id="event-available-tickets"
                    name="available_tickets"
                    value={formData.available_tickets}
                    onChange={handleChange}
                    required
                    min="1"
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label htmlFor="poster-upload" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Poster
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-300 transition-colors">
                  {previewUrl ? (
                    <div className="mb-4 relative">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg mx-auto"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPosterFile(null);
                          setPreviewUrl('');
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    </div>
                  )}
                  <input
                    type="file"
                    id="poster-upload"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <label
                    htmlFor="poster-upload"
                    className={`cursor-pointer inline-block px-6 py-2 rounded-lg font-medium transition-colors ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {previewUrl ? 'Change Image' : 'Upload Poster'}
                  </label>
                  <p className="text-sm text-gray-500 mt-2">Recommended: 1200x800px, max 5MB</p>
                </div>
              </div>

              <div>
                <label htmlFor="event-venue" className="block text-sm font-medium text-gray-700 mb-2">
                  Venue *
                </label>
                <input
                  type="text"
                  id="event-venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter venue name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="event-location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label htmlFor="event-county" className="block text-sm font-medium text-gray-700 mb-2">
                    County *
                  </label>
                  <select
                    id="event-county"
                    name="county"
                    value={formData.county}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select County</option>
                    {KENYAN_COUNTIES.map(county => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    id="event-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="event-age-restriction" className="block text-sm font-medium text-gray-700 mb-2">
                    Age Restriction
                  </label>
                  <input
                    type="number"
                    id="event-age-restriction"
                    name="age_restriction"
                    value={formData.age_restriction}
                    onChange={handleChange}
                    min="0"
                    max="120"
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="18 (leave blank for all ages)"
                  />
                </div>
              </div>

              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                />
                <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
                  Publish event immediately (visible to public)
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;