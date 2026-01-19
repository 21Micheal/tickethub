// frontend/src/pages/admin/ValidateTickets.jsx
import React, { useState, useRef } from 'react';
import { adminAPI } from '../../services/api';
import {
  CheckCircle,
  XCircle,
  Search,
  Camera,
  QrCode,
  Ticket as TicketIcon,
  User,
  Calendar,
  MapPin,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import QrScanner from 'qr-scanner';

const ValidateTickets = () => {
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [recentValidations, setRecentValidations] = useState([]);
  const [validationMethod, setValidationMethod] = useState('manual');
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!ticketCode.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }

    await validateTicket(ticketCode.trim());
  };

  const validateTicket = async (code, method = validationMethod) => {
    try {
      setLoading(true);
      
      const response = await adminAPI.validateTicket({
        ticket_code: code,
        validation_method: method
      });
      
      setValidationResult(response.data.data);
      
      // Add to recent validations
      setRecentValidations(prev => [
        {
          ...response.data.data,
          timestamp: new Date().toISOString(),
          method: method
        },
        ...prev.slice(0, 4) // Keep only 5 most recent
      ]);
      
      toast.success(response.data.message || 'Ticket validated successfully!');
      setTicketCode('');
      
      // Stop scanning if active
      if (scanning) {
        stopScanner();
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      
      if (error.response?.data?.error) {
        setValidationResult({
          error: error.response.data.error,
          data: error.response.data.data
        });
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to validate ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      setScanning(true);
      setValidationMethod('qr');
      
      const videoElement = videoRef.current;
      if (!videoElement) return;

      qrScannerRef.current = new QrScanner(
        videoElement,
        (result) => {
          if (result?.data) {
            validateTicket(result.data, 'qr');
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
      
    } catch (error) {
      console.error('Scanner error:', error);
      toast.error('Failed to start scanner. Please check camera permissions.');
      stopScanner();
    }
  };

  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const handleManualValidation = () => {
    setValidationMethod('manual');
    if (scanning) {
      stopScanner();
    }
  };

  const handleQrValidation = () => {
    if (!scanning) {
      startScanner();
    } else {
      stopScanner();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ticket Validation</h1>
          <p className="text-gray-600 mt-1">
            Validate tickets at entry points using QR codes or manual entry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRecentValidations([])}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Validation Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Validation Method Toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Validation Method
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleManualValidation}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  validationMethod === 'manual' && !scanning
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    validationMethod === 'manual' && !scanning
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Manual Entry</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Enter ticket code manually
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleQrValidation}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  scanning
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    scanning
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {scanning ? <Camera className="h-6 w-6" /> : <QrCode className="h-6 w-6" />}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">QR Code Scan</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {scanning ? 'Scanning... Click to stop' : 'Scan QR code from ticket'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Scanner View */}
          {scanning && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                QR Code Scanner
              </h3>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  aria-label="QR Code camera feed"
                >
                  {/* Added empty track for a11y compliance */}
                  <track kind="captions" />
                </video>
                <div className="absolute inset-0 border-2 border-green-500 border-dashed m-8 pointer-events-none"></div>
              </div>
              <p className="text-center text-gray-500 mt-4">
                Position the QR code within the frame to scan
              </p>
            </div>
          )}

          {/* Manual Input */}
          {!scanning && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Enter Ticket Code
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <input
                    type="text"
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                    placeholder="Enter ticket code (e.g., TKT-ABC123 or TH-REF-001)"
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                    disabled={loading}
                  />
                  <TicketIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <button
                    type="submit"
                    disabled={loading || !ticketCode.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      'Validate'
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  You can enter full ticket code or scan QR code
                </p>
              </form>
            </div>
          )}

          {/* Validation Result */}
          {validationResult && (
            <div className={`rounded-xl shadow-sm border p-6 ${
              validationResult.error
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-start">
                <div className={`p-3 rounded-lg ${
                  validationResult.error
                    ? 'bg-red-100 text-red-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {validationResult.error ? (
                    <XCircle className="h-6 w-6" />
                  ) : (
                    <CheckCircle className="h-6 w-6" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className={`text-lg font-semibold ${
                    validationResult.error ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {validationResult.error ? 'Validation Failed' : 'Validation Successful!'}
                  </h3>
                  
                  {validationResult.error ? (
                    <div className="mt-2">
                      <p className="text-red-700">{validationResult.error}</p>
                      {validationResult.data && (
                        <div className="mt-3 p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">
                            Ticket Code: <span className="font-mono">{validationResult.data.ticket_code}</span>
                          </p>
                          {validationResult.data.validated_at && (
                            <p className="text-sm text-gray-600 mt-1">
                              Already validated on: {formatDate(validationResult.data.validated_at)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3">
                      {/* Ticket Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <TicketIcon className="h-4 w-4 mr-2 text-gray-400" />
                            Ticket Information
                          </h4>
                          <p className="text-sm">
                            <span className="text-gray-500">Code:</span>{' '}
                            <span className="font-mono font-medium">{validationResult.ticket?.code}</span>
                          </p>
                          <p className="text-sm mt-1">
                            <span className="text-gray-500">Status:</span>{' '}
                            <span className="font-medium text-green-600">{validationResult.ticket?.status}</span>
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            Customer
                          </h4>
                          <p className="text-sm">
                            <span className="text-gray-500">Name:</span>{' '}
                            <span className="font-medium">{validationResult.customer?.name}</span>
                          </p>
                          <p className="text-sm mt-1">
                            <span className="text-gray-500">Phone:</span>{' '}
                            <span className="font-medium">{validationResult.customer?.phone}</span>
                          </p>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="bg-white p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          Event Details
                        </h4>
                        <p className="text-sm font-medium">{validationResult.event?.title}</p>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {validationResult.event?.venue} • {validationResult.event?.location}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(validationResult.event?.date)}
                        </p>
                      </div>

                      {/* Booking Details */}
                      <div className="bg-white p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                          Booking Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Reference</p>
                            <p className="font-mono text-sm">{validationResult.booking?.reference}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Amount</p>
                            <p className="font-medium">{formatCurrency(validationResult.booking?.total_amount)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Recent Validations */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Validations
            </h3>
            
            {recentValidations.length > 0 ? (
              <div className="space-y-4">
                {recentValidations.map((validation, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`p-1 rounded ${
                          validation.error
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {validation.error ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                        </div>
                        <span className="ml-2 text-sm font-medium">
                          {validation.ticket?.code?.substring(0, 12)}...
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {validation.method === 'qr' ? 'QR' : 'Manual'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {validation.event?.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(validation.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>No recent validations</p>
                <p className="text-sm mt-2">
                  Validated tickets will appear here
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Today's Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Validated</span>
                <span className="font-medium text-green-600">
                  {recentValidations.filter(v => !v.error).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-medium text-red-600">
                  {recentValidations.filter(v => v.error).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-medium">{recentValidations.length}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h4 className="font-medium text-blue-800 mb-2">Validation Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ensure good lighting when scanning QR codes</li>
              <li>• Verify customer identity if required</li>
              <li>• Check ticket expiry date</li>
              <li>• Report suspicious tickets immediately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidateTickets;
