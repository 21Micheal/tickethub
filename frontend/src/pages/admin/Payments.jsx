// frontend/src/pages/admin/Payments.jsx
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Search, Filter, CreditCard, CheckCircle, XCircle, AlertCircle, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter !== 'all' ? statusFilter : undefined
      };
      const response = await adminAPI.getAllPayments(params);
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId, action) => {
    try {
      await adminAPI.approvePayment(paymentId, { action });
      toast.success(`Payment ${action}d successfully`);
      fetchPayments(); // Refresh
      setShowActionModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Payment action error:', error);
      toast.error(error.response?.data?.error || `Failed to ${action} payment`);
    }
  };

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
      successful: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.mpesa_receipt_number?.toLowerCase().includes(searchLower) ||
      payment.booking_reference?.toLowerCase().includes(searchLower) ||
      payment.customer_name?.toLowerCase().includes(searchLower) ||
      payment.phone_number?.toLowerCase().includes(searchLower)
    );
  });

  const pendingPayments = payments.filter(p => p.payment_status === 'pending');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
          <p className="text-gray-600 mt-2">Review and process all payment transactions</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-yellow-600 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">
                  {pendingPayments.length} Pending Payment{pendingPayments.length > 1 ? 's' : ''}
                </h3>
                <p className="text-yellow-700">
                  Requires review and approval
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('pending')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Review Now
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline-block h-4 w-4 mr-2" />
              Search Payments
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by receipt, reference, or name..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline-block h-4 w-4 mr-2" />
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
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
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {payment.mpesa_receipt_number || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          <CreditCard className="inline-block h-4 w-4 mr-1" />
                          M-Pesa • {formatDate(payment.payment_date)}
                        </div>
                        {payment.phone_number && (
                          <div className="text-sm text-gray-500">
                            Phone: {payment.phone_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{payment.customer_name}</div>
                        <div className="text-sm text-gray-500">{payment.customer_email}</div>
                        <div className="text-sm text-gray-500">
                          Booking: {payment.booking_reference}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          Event: {payment.event_title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payment.number_of_tickets} ticket{payment.number_of_tickets > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.payment_status)}
                      {payment.processed_at && (
                        <div className="text-sm text-gray-500 mt-1">
                          Processed: {formatDate(payment.processed_at)}
                        </div>
                      )}
                      {payment.result_desc && payment.payment_status === 'failed' && (
                        <div className="text-sm text-red-600 mt-1">
                          {payment.result_desc}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            // View payment details
                            toast.info('Viewing payment details');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {payment.payment_status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setActionType('approve');
                                setShowActionModal(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Approve Payment"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setActionType('reject');
                                setShowActionModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Reject Payment"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold mb-2">
            {formatCurrency(
              payments
                .filter(p => p.payment_status === 'successful')
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
            )}
          </div>
          <div className="text-green-100">Total Processed</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold mb-2">
            {payments.filter(p => p.payment_status === 'pending').length}
          </div>
          <div className="text-yellow-100">Pending Approval</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold mb-2">
            {payments.filter(p => p.payment_status === 'successful').length}
          </div>
          <div className="text-blue-100">Successful Payments</div>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="text-3xl font-bold mb-2">
            {payments.filter(p => p.payment_status === 'failed').length}
          </div>
          <div className="text-red-100">Failed Payments</div>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {showActionModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              {actionType === 'approve' ? (
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to {actionType} this payment?
                <br />
                <span className="font-medium">{selectedPayment.mpesa_receipt_number || 'Payment'}</span>
                <br />
                Amount: {formatCurrency(selectedPayment.amount)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePaymentAction(selectedPayment.id, actionType)}
                  className={`flex-1 ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white py-3 rounded-lg font-medium transition-colors`}
                >
                  {actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;