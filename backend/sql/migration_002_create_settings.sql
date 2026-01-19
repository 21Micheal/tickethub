-- backend/sql/migration_002_create_settings.sql
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('site_name', 'Tickethub', 'string', 'general', 'Website name'),
('site_email', 'support@tickethub.co.ke', 'string', 'general', 'Support email address'),
('site_phone', '+254743183082', 'string', 'general', 'Support phone number'),
('mpesa_active', 'true', 'boolean', 'payment', 'Enable M-Pesa payments'),
('ticket_expiry_days', '30', 'number', 'tickets', 'Days before ticket expires'),
('booking_timeout_minutes', '15', 'number', 'bookings', 'Minutes before pending booking expires'),
('enable_email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('enable_sms_notifications', 'true', 'boolean', 'notifications', 'Enable SMS notifications'),
('currency', 'KES', 'string', 'general', 'Default currency'),
('timezone', 'Africa/Nairobi', 'string', 'general', 'System timezone'),
('maintenance_mode', 'false', 'boolean', 'general', 'Enable maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();