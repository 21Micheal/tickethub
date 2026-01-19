// frontend/src/pages/admin/Dashboard.jsx - CLEAN VERSION
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  Package,
  BarChart3,
  Calendar,
  Users as UsersIcon,
  DollarSign,
  Ticket,
  CreditCard
} from 'lucide-react';
import RevenueChart from '../../components/admin/RevenueChart';
import RecentBookingsTable from '../../components/admin/RecentBookingsTable';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchDashboardStats();
    toast.success('Dashboard refreshed');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
        <p className="text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold">Failed to load dashboard</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  // Performance metrics (unique to dashboard)
  const performanceCards = [
    {
      title: 'Conversion Rate',
      value: stats.quickStats?.conversionRate ? `${stats.quickStats.conversionRate}%` : 'N/A',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-700',
      description: 'Bookings per User',
      link: '/admin/users'
    },
    {
      title: 'Avg. Ticket Price',
      value: formatCurrency(stats.quickStats?.avgTicketPrice || 0),
      icon: DollarSign,
      color: 'bg-blue-100 text-blue-700',
      description: 'Per booking',
      link: '/admin/bookings'
    },
    {
      title: 'Occupancy Rate',
      value: stats.quickStats?.occupancyRate ? `${stats.quickStats.occupancyRate}%` : 'N/A',
      icon: Activity,
      color: 'bg-purple-100 text-purple-700',
      description: 'Venue utilization',
      link: '/admin/events'
    },
    {
      title: 'Active Events',
      value: stats.activeEvents,
      icon: Calendar,
      color: 'bg-orange-100 text-orange-700',
      description: 'Upcoming events',
      link: '/admin/events?filter=active'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Performance overview and key metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
            <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceCards.map((metric, index) => (
            <Link
              key={index}
              to={metric.link}
              className="block group"
            >
              <div className="p-4 rounded-lg border border-gray-100 hover:border-red-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${metric.color}`}>
                    <metric.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                      {metric.value}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{metric.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  <BarChart3 className="inline-block h-5 w-5 mr-2" />
                  Revenue Trend
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Daily revenue for the selected period
                </p>
              </div>
              <Link 
                to="/admin/revenue" 
                className="text-red-600 hover:text-red-700 text-sm font-medium mt-3 sm:mt-0"
              >
                View Detailed Reports →
              </Link>
            </div>
            {stats.revenueChart && stats.revenueChart.length > 0 ? (
              <div className="h-80">
                <RevenueChart data={stats.revenueChart} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                <p>No revenue data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link
                to="/admin/events?action=create"
                className="block w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Event
              </Link>
              <Link
                to="/admin/tickets/validate"
                className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                <Ticket className="h-5 w-5" />
                Validate Tickets
              </Link>
              <Link
                to="/admin/users"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                <UsersIcon className="h-5 w-5" />
                Manage Users
              </Link>
              <Link
                to="/admin/settings"
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                System Settings
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              System Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">API Services</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Database</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Active Users</span>
                </div>
                <span className="text-sm text-gray-700 font-medium">{formatNumber(stats.totalUsers)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">System Uptime</span>
                </div>
                <span className="text-sm text-gray-700 font-medium">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Bookings
            </h2>
            <Link 
              to="/admin/bookings" 
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              View All →
            </Link>
          </div>
          {stats.recentBookings && stats.recentBookings.length > 0 ? (
            <RecentBookingsTable bookings={stats.recentBookings} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No recent bookings</p>
            </div>
          )}
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Activity
            </h2>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              View Logs →
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Ticket className="h-4 w-4 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">New booking confirmed</p>
                  <p className="text-xs text-gray-500">5 min ago • #TKT-123456</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">KES 10,000</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <UsersIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">New user registered</p>
                  <p className="text-xs text-gray-500">1 hour ago • John Doe</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">Client</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Payment pending review</p>
                  <p className="text-xs text-gray-500">2 hours ago • #PAY-789</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">Action required</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Event published</p>
                  <p className="text-xs text-gray-500">Today • Nairobi Music Fest</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">Published</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Notifications */}
      {stats.pendingPayments > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">Attention Required</h3>
              <p className="text-yellow-700 text-sm mt-1">
                You have {stats.pendingPayments} pending payments requiring review.
              </p>
              <div className="flex gap-3 mt-3">
                <Link
                  to="/admin/payments?status=pending"
                  className="inline-block text-sm font-medium text-yellow-700 hover:text-yellow-800"
                >
                  Review Payments →
                </Link>
                <Link
                  to="/admin/bookings"
                  className="inline-block text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  View All Bookings →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;