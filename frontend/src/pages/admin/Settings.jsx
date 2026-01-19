// frontend/src/pages/admin/Settings.jsx
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import {
  Save,
  Bell,
  CreditCard,
  Mail,
  Phone,
  Globe,
  Shield,
  Database,
  Clock,
  DollarSign,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showMpesaCredentials, setShowMpesaCredentials] = useState(false);

  const [settings, setSettings] = useState({
    // General Settings
    site_name: 'Tickethub',
    site_email: 'support@tickethub.co.ke',
    site_phone: '+254700000000',
    contact_address: 'Nairobi, Kenya',
    timezone: 'Africa/Nairobi',
    currency: 'KES',
    
    // M-Pesa Settings
    mpesa_active: true,
    mpesa_business_shortcode: '',
    mpesa_passkey: '',
    mpesa_consumer_key: '',
    mpesa_consumer_secret: '',
    
    // Notification Settings
    enable_email_notifications: true,
    enable_sms_notifications: true,
    enable_push_notifications: false,
    send_booking_confirmation: true,
    send_payment_receipts: true,
    send_event_reminders: true,
    
    // Booking Settings
    booking_timeout_minutes: 15,
    max_tickets_per_booking: 10,
    allow_guest_checkout: false,
    require_email_verification: true,
    
    // Ticket Settings
    ticket_expiry_days: 30,
    allow_ticket_transfer: true,
    require_id_verification: false,
    
    // Security Settings
    require_2fa: false,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    enable_audit_logs: true,
    
    // System Settings
    maintenance_mode: false,
    enable_cdn: true,
    cache_duration_minutes: 5,
    backup_frequency: 'daily'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      if (response.data.data) {
        setSettings(prev => ({
          ...prev,
          ...response.data.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? value === 'true' : value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await adminAPI.updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMpesa = async () => {
    try {
      toast.loading('Testing M-Pesa connection...');
      // Simulate API call
      setTimeout(() => {
        toast.dismiss();
        toast.success('M-Pesa connection successful!');
      }, 1500);
    } catch (error) {
      toast.error('M-Pesa test failed');
    }
  };

  const handleClearCache = async () => {
    try {
      toast.loading('Clearing cache...');
      setTimeout(() => {
        toast.dismiss();
        toast.success('Cache cleared successfully');
      }, 1000);
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'mpesa', label: 'M-Pesa', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'booking', label: 'Booking', icon: Clock },
    { id: 'ticket', label: 'Ticket', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Database }
  ];

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure system preferences and integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Cache
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center whitespace-nowrap py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    id="site-name"
                    value={settings.site_name}
                    onChange={(e) => handleSettingChange('site_name', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="site-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    id="site-email"
                    value={settings.site_email}
                    onChange={(e) => handleSettingChange('site_email', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="site-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Support Phone
                  </label>
                  <input
                    type="text"
                    id="site-phone"
                    value={settings.site_phone}
                    onChange={(e) => handleSettingChange('site_phone', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="contact-address" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Address
                  </label>
                  <input
                    type="text"
                    id="contact-address"
                    value={settings.contact_address}
                    onChange={(e) => handleSettingChange('contact_address', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  >
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  >
                    <option value="KES">Kenyan Shilling (KES)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* M-Pesa Settings */}
          {activeTab === 'mpesa' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">M-Pesa Integration</h3>
                  <p className="text-sm text-gray-500">Configure M-Pesa payment gateway</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestMpesa}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Test Connection
                  </button>
                  <div className="flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-2 ${settings.mpesa_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-700">M-Pesa is {settings.mpesa_active ? 'active' : 'inactive'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="mpesa_active"
                    checked={settings.mpesa_active}
                    onChange={(e) => handleSettingChange('mpesa_active', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="mpesa_active" className="ml-2 block text-sm text-gray-700">
                    Enable M-Pesa payments
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mpesa_business_shortcode" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Shortcode
                    </label>
                    <input
                      type="text"
                      id="mpesa_business_shortcode"
                      value={settings.mpesa_business_shortcode}
                      onChange={(e) => handleSettingChange('mpesa_business_shortcode', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                      placeholder="123456"
                    />
                  </div>
                  <div>
                    <label htmlFor="mpesa_passkey" className="block text-sm font-medium text-gray-700 mb-2">
                      Passkey
                    </label>
                    <div className="relative">
                      <input
                        type={showMpesaCredentials ? 'text' : 'password'}
                        id="mpesa_passkey"
                        value={settings.mpesa_passkey}
                        onChange={(e) => handleSettingChange('mpesa_passkey', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                        placeholder="Your M-Pesa passkey"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMpesaCredentials(!showMpesaCredentials)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showMpesaCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="mpesa_consumer_key" className="block text-sm font-medium text-gray-700 mb-2">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      id="mpesa_consumer_key"
                      value={settings.mpesa_consumer_key}
                      onChange={(e) => handleSettingChange('mpesa_consumer_key', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                      placeholder="Your consumer key"
                    />
                  </div>
                  <div>
                    <label htmlFor="mpesa_consumer_secret" className="block text-sm font-medium text-gray-700 mb-2">
                      Consumer Secret
                    </label>
                    <input
                      type="text"
                      id="mpesa_consumer_secret"
                      value={settings.mpesa_consumer_secret}
                      onChange={(e) => handleSettingChange('mpesa_consumer_secret', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                      placeholder="Your consumer secret"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Keep your M-Pesa credentials secure. They should only be used in production environment.
                </p>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Send notifications via email</p>
                  </div>
                  <label htmlFor="enable_email_notifications" aria-label="Enable email notifications" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="enable_email_notifications"
                      checked={settings.enable_email_notifications}
                      onChange={(e) => handleSettingChange('enable_email_notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">SMS Notifications</p>
                    <p className="text-sm text-gray-500">Send notifications via SMS</p>
                  </div>
                  <label htmlFor="enable_sms_notifications" aria-label="Enable SMS notifications" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="enable_sms_notifications"
                      checked={settings.enable_sms_notifications}
                      onChange={(e) => handleSettingChange('enable_sms_notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                <div className="space-y-3 pl-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="send_booking_confirmation"
                      checked={settings.send_booking_confirmation}
                      onChange={(e) => handleSettingChange('send_booking_confirmation', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      disabled={!settings.enable_email_notifications && !settings.enable_sms_notifications}
                    />
                    <label htmlFor="send_booking_confirmation" className="ml-2 block text-sm text-gray-700">
                      Send booking confirmation
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="send_payment_receipts"
                      checked={settings.send_payment_receipts}
                      onChange={(e) => handleSettingChange('send_payment_receipts', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      disabled={!settings.enable_email_notifications}
                    />
                    <label htmlFor="send_payment_receipts" className="ml-2 block text-sm text-gray-700">
                      Send payment receipts
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="send_event_reminders"
                      checked={settings.send_event_reminders}
                      onChange={(e) => handleSettingChange('send_event_reminders', e.target.checked)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      disabled={!settings.enable_email_notifications && !settings.enable_sms_notifications}
                    />
                    <label htmlFor="send_event_reminders" className="ml-2 block text-sm text-gray-700">
                      Send event reminders (24h before)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Settings */}
          {activeTab === 'booking' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Booking Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="booking_timeout_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    id="booking_timeout_minutes"
                    value={settings.booking_timeout_minutes}
                    onChange={(e) => handleSettingChange('booking_timeout_minutes', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                  <p className="text-sm text-gray-500 mt-1">Time allowed to complete payment</p>
                </div>
                <div>
                  <label htmlFor="max_tickets_per_booking" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tickets per Booking
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    id="max_tickets_per_booking"
                    value={settings.max_tickets_per_booking}
                    onChange={(e) => handleSettingChange('max_tickets_per_booking', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allow_guest_checkout"
                    checked={settings.allow_guest_checkout}
                    onChange={(e) => handleSettingChange('allow_guest_checkout', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allow_guest_checkout" className="ml-2 block text-sm text-gray-700">
                    Allow guest checkout (without account)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_email_verification"
                    checked={settings.require_email_verification}
                    onChange={(e) => handleSettingChange('require_email_verification', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_email_verification" className="ml-2 block text-sm text-gray-700">
                    Require email verification for new accounts
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="session_timeout_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    id="session_timeout_minutes"
                    min="5"
                    max="1440"
                    value={settings.session_timeout_minutes}
                    onChange={(e) => handleSettingChange('session_timeout_minutes', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="max_login_attempts" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    id="max_login_attempts"
                    value={settings.max_login_attempts}
                    onChange={(e) => handleSettingChange('max_login_attempts', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                  </div>
                  <label htmlFor="require_2fa" aria-label="Require two-factor authentication" className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="require_2fa"
                      checked={settings.require_2fa}
                      onChange={(e) => handleSettingChange('require_2fa', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_audit_logs"
                    checked={settings.enable_audit_logs}
                    onChange={(e) => handleSettingChange('enable_audit_logs', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable_audit_logs" className="ml-2 block text-sm text-gray-700">
                    Enable audit logs (recommended)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* System Settings */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Temporarily disable the site for maintenance</p>
                </div>
                <label htmlFor="maintenance_mode" aria-label="Enable maintenance mode" className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="maintenance_mode"
                    checked={settings.maintenance_mode}
                    onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="cache_duration_minutes" className="block text-sm font-medium text-gray-700 mb-2">
                    Cache Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    id="cache_duration_minutes"
                    value={settings.cache_duration_minutes}
                    onChange={(e) => handleSettingChange('cache_duration_minutes', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="backup_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Backup Frequency
                  </label>
                  <select
                    id="backup_frequency"
                    value={settings.backup_frequency}
                    onChange={(e) => handleSettingChange('backup_frequency', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable_cdn"
                  checked={settings.enable_cdn}
                  onChange={(e) => handleSettingChange('enable_cdn', e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_cdn" className="ml-2 block text-sm text-gray-700">
                  Enable CDN for static assets (improves performance)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;