// frontend/src/components/admin/EditEventModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { KENYAN_COUNTIES } from '../../constants/counties';
import { eventsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EditEventModal = ({ isOpen, onClose, event, onSuccess }) => {
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
    is_published: false,
    is_cancelled: false
  });
  const [posterFile, setPosterFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const categories = [
    'Music', 'Technology', 'Food & Drink', 'Sports', 'Arts & Culture',
    'Business', 'Education', 'Health & Wellness', 'Family', 'Other'
  ];

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        venue: event.venue || '',
        location: event.location || '',
        county: event.county || 'Nairobi',
        event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
        end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
        ticket_price: event.ticket_price || '',
        available_tickets: event.available_tickets || '',
        category: event.category || '',
        age_restriction: event.age_restriction || '',
        is_published: event.is_published || false,
        is_cancelled: event.is_cancelled || false
      });
      
      if (event.poster_url) {
        setPreviewUrl(event.poster_url);
      }
    }
  }, [event]);

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

  // frontend/src/components/admin/EditEventModal.jsx - FIXED UPLOAD HANDLING
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
      
      console.log('Updating event:', event.id);
      
      // Prepare update data
      const updateData = {
        ...formData,
        ticket_price: parseFloat(formData.ticket_price),
        available_tickets: parseInt(formData.available_tickets),
        age_restriction: formData.age_restriction ? parseInt(formData.age_restriction) : null,
        is_published: formData.is_published,
        is_cancelled: formData.is_cancelled
      };

      // Update event
      await eventsAPI.updateEvent(event.id, updateData);
      
      // Upload poster if changed AND file exists
      if (posterFile && posterFile instanceof File) {
        try {
          console.log('Uploading new poster file:', {
            name: posterFile.name,
            size: posterFile.size,
            type: posterFile.type,
            lastModified: posterFile.lastModified
          });
          
          // Validate file before upload
          if (posterFile.size === 0) {
            throw new Error('File is empty');
          }
          
          if (posterFile.size > 5 * 1024 * 1024) {
            throw new Error('File too large (max 5MB)');
          }
          
          if (!posterFile.type.startsWith('image/')) {
            throw new Error('File must be an image');
          }
          
          const uploadToast = toast.loading('Uploading event poster...');
          
          try {
            const response = await eventsAPI.uploadPoster(event.id, posterFile);
            console.log('Poster upload success:', response.data);
            
            toast.dismiss(uploadToast);
            toast.success('Poster updated!');
            
          } catch (uploadError) {
            toast.dismiss(uploadToast);
            console.error('Poster upload error:', {
              status: uploadError.response?.status,
              data: uploadError.response?.data,
              message: uploadError.message,
              config: uploadError.config
            });
            
            // Check if it's a network error vs server error
            if (uploadError.code === 'ECONNABORTED' || uploadError.message.includes('timeout')) {
              toast.error('Upload timed out. Please try again with a smaller file.');
            } else if (uploadError.response?.status === 413) {
              toast.error('File too large. Please use a smaller image.');
            } else if (uploadError.response?.status === 400) {
              toast.error(uploadError.response.data?.error || 'Invalid file format');
            } else {
              toast.error(uploadError.response?.data?.error || 'Event updated but poster upload failed.');
            }
          }
        } catch (validationError) {
          console.error('Poster validation error:', validationError);
          toast.error(validationError.message);
        }
      } else {
        toast.success('Event updated successfully!');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Update event error:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.response?.status === 400) {
        const errorMessage = error.response.data.error || error.response.data.message;
        toast.error(`Validation error: ${errorMessage}`);
      } else if (error.response?.status === 409) {
        toast.error('An event with similar details already exists');
      } else {
        toast.error(error.response?.data?.error || 'Failed to update event');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleClose = () => {
    setPosterFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    onClose();
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">Editing: {event.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline-block h-4 w-4 mr-1" />
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    id="event_date"
                    name="event_date"
                    value={formData.event_date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline-block h-4 w-4 mr-1" />
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ticket_price" className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline-block h-4 w-4 mr-1" />
                    Ticket Price (KES) *
                  </label>
                  <input
                    type="number"
                    id="ticket_price"
                    name="ticket_price"
                    value={formData.ticket_price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    disabled={loading || event.confirmed_bookings > 0}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                  />
                  {event.confirmed_bookings > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cannot change price with existing bookings
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="available_tickets" className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="inline-block h-4 w-4 mr-1" />
                    Available Tickets *
                  </label>
                  <input
                    type="number"
                    id="available_tickets"
                    name="available_tickets"
                    value={formData.available_tickets}
                    onChange={handleChange}
                    required
                    min="0"
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label htmlFor="poster-upload" aria-label="Event Poster" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Poster
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                          setPreviewUrl(event.poster_url || '');
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
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline-block h-4 w-4 mr-1" />
                  Venue *
                </label>
                <input
                  type="text"
                  id="venue"
                    name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label htmlFor="county" className="block text-sm font-medium text-gray-700 mb-2">
                    County *
                  </label>
                  <select
                    id="county"
                    name="county"
                    value={formData.county}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
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
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="age_restriction" className="block text-sm font-medium text-gray-700 mb-2">
                    Age Restriction
                  </label>
                  <input
                    type="number"
                    id="age_restriction"
                    name="age_restriction"
                    value={formData.age_restriction}
                    onChange={handleChange}
                    min="0"
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:bg-gray-50"
                    placeholder="18 (leave blank for all ages)"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_published"
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleChange}
                    disabled={loading || formData.is_cancelled}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                  />
                  <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
                    Publish event (visible to public)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_cancelled"
                    name="is_cancelled"
                    checked={formData.is_cancelled}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:cursor-not-allowed"
                  />
                  <label htmlFor="is_cancelled" className="ml-2 block text-sm text-gray-700">
                    Cancel event (no new bookings allowed)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Updating...
                </>
              ) : (
                'Update Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEventModal;