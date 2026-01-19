// frontend/src/pages/admin/Reports.jsx
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  DollarSign, 
  Download, 
  Calendar, 
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Ticket,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState(null);
  const [filters, setFilters] = useState({
    period: 'monthly',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)), // Last 6 months
    endDate: new Date(),
    eventId: ''
  });
  const [availableEvents, setAvailableEvents] = useState([]);
  const [selectedTab, setSelectedTab] = useState('revenue');

  useEffect(() => {
    fetchAvailableEvents();
    fetchReports();
  }, [filters.period]);

  const fetchAvailableEvents = async () => {
    try {
      const response = await adminAPI.getAllEvents({ limit: 100 });
      setAvailableEvents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        period: filters.period,
        start_date: filters.startDate.toISOString().split('T')[0],
        end_date: filters.endDate.toISOString().split('T')[0],
        ...(filters.eventId && { event_id: filters.eventId })
      };

      const response = await adminAPI.getRevenueReports(params);
      setReports(response.data.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchReports();
  };

  const handleDownloadReport = async (format = 'csv') => {
    try {
      toast.loading(`Generating ${format.toUpperCase()} report...`);
      
      // In a real app, this would call a backend endpoint
      // For now, we'll simulate the download
      setTimeout(() => {
        toast.dismiss();
        toast.success('Report generated successfully!');
        
        // Create a dummy download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
          JSON.stringify(reports, null, 2)
        );
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `tickethub-report-${new Date().toISOString().split('T')[0]}.${format}`);
        downloadAnchor.click();
      }, 1500);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to generate report');
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

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value}%`;
  };

  if (loading && !reports) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">
            Detailed insights and analytics for your Tickethub platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownloadReport('csv')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleDownloadReport('pdf')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            <Filter className="inline-block h-5 w-5 mr-2" />
            Filter Reports
          </h2>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Apply Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="report-period" className="block text-sm font-medium text-gray-700 mb-2">
              Report Period
            </label>
            <select
              id="report-period"
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <DatePicker
              id="start-date"
              selected={filters.startDate}
              onChange={(date) => handleFilterChange('startDate', date)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
              dateFormat="yyyy-MM-dd"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <DatePicker
              id="end-date"
              selected={filters.endDate}
              onChange={(date) => handleFilterChange('endDate', date)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
              dateFormat="yyyy-MM-dd"
            />
          </div>

          <div>
            <label htmlFor="event-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Event (Optional)
            </label>
            <select
              id="event-filter"
              value={filters.eventId}
              onChange={(e) => handleFilterChange('eventId', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
            >
              <option value="">All Events</option>
              {availableEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reports?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(reports.summary.total_revenue)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-600 text-sm">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>Overall revenue</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {reports.summary.total_transactions}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-blue-600 text-sm">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>{reports.summary.total_bookings} bookings</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Unique Customers</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {reports.summary.unique_customers || reports.summary.total_bookings}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-purple-600 text-sm">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>Active customers</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Avg. Transaction</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(reports.summary.avg_transaction)}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-orange-600 text-sm">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              <span>Per transaction</span>
            </div>
          </div>
        </div>
      )}

      {/* Report Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setSelectedTab('revenue')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'revenue'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Revenue Report
            </button>
            <button
              onClick={() => setSelectedTab('events')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'events'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Top Events
            </button>
            <button
              onClick={() => setSelectedTab('detailed')}
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                selectedTab === 'detailed'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detailed View
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'revenue' && reports?.reports && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unique Customers
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.reports.map((report, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.period_formatted || report.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(report.total_revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.total_transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.total_bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(report.average_transaction)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.unique_customers || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'events' && reports?.topEvents && (
            <div className="space-y-4">
              {reports.topEvents.map((event, index) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <Ticket className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <p className="text-sm text-gray-500">{event.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(event.revenue)}</p>
                    <p className="text-sm text-gray-500">{event.bookings_count} bookings</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'detailed' && (
            <div className="text-center py-12">
              <PieChart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Detailed Analytics</h3>
              <p className="text-gray-500">
                More detailed analytics and visualizations coming soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
