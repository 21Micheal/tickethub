// frontend/src/pages/client/Tickets.jsx
import React, { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import { Ticket, Calendar, MapPin, Download, QrCode, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import QRCode from 'qrcode.react';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getUserTickets();
      setTickets(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleShowQRCode = async (ticketId) => {
    try {
      const response = await bookingsAPI.getTicketQR(ticketId);
      setSelectedTicket({
        id: ticketId,
        qr_code: response.data.data.qr_code,
        ticket_code: response.data.data.ticket_code
      });
      setShowQRModal(true);
    } catch (error) {
      console.error('Failed to fetch QR code:', error);
      toast.error('Failed to load QR code');
    }
  };

  const downloadTicket = (ticket) => {
    // This would generate a PDF in production
    toast.success(`Ticket ${ticket.ticket_code} downloaded`);
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM dd, yyyy • h:mm a');
  };

  const getTicketStatusBadge = (ticket) => {
    if (ticket.is_validated) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          Validated
        </span>
      );
    }
    
    if (new Date(ticket.event_date) < new Date()) {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          Expired
        </span>
      );
    }
    
    if (ticket.ticket_status === 'cancelled') {
      return (
        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="h-4 w-4" />
          Cancelled
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        Active
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
        <p className="text-gray-600 mt-2">Access and manage all your event tickets</p>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets yet</h3>
          <p className="text-gray-600 mb-6">Your purchased tickets will appear here</p>
          <a 
            href="/events" 
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Events
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Ticket Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white">
                <div className="flex items-center justify-between">
                  <Ticket className="h-8 w-8" />
                  <div className="text-right">
                    <p className="text-sm opacity-90">Ticket Code</p>
                    <p className="font-mono font-bold">{ticket.ticket_code}</p>
                  </div>
                </div>
              </div>

              {/* Ticket Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{ticket.event_title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(ticket.event_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{ticket.venue}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Booking Reference</p>
                        <p className="font-medium">{ticket.booking_reference}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Attendee</p>
                        <p className="font-medium">{ticket.attendee_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {getTicketStatusBadge(ticket)}
                    
                    {ticket.validated_at && (
                      <div className="text-sm text-gray-500">
                        Validated: {format(new Date(ticket.validated_at), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleShowQRCode(ticket.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      <QrCode className="h-4 w-4" />
                      Show QR
                    </button>
                    <button
                      onClick={() => downloadTicket(ticket)}
                      className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Ticket QR Code</h3>
              <p className="text-gray-600 mb-6">Present this code at the event entrance</p>
              
              <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                {selectedTicket.qr_code ? (
                  <img 
                    src={selectedTicket.qr_code} 
                    alt="QR Code" 
                    className="w-64 h-64 mx-auto"
                  />
                ) : (
                  <QRCode 
                    value={selectedTicket.ticket_code} 
                    size={256}
                    className="mx-auto"
                  />
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Ticket Code</p>
                <p className="font-mono font-bold text-lg">{selectedTicket.ticket_code}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Download QR code
                    const link = document.createElement('a');
                    if (selectedTicket.qr_code) {
                      link.href = selectedTicket.qr_code;
                      link.download = `ticket-${selectedTicket.ticket_code}.png`;
                    } else {
                      const canvas = document.querySelector('canvas');
                      link.href = canvas.toDataURL();
                      link.download = `ticket-${selectedTicket.ticket_code}.png`;
                    }
                    link.click();
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;