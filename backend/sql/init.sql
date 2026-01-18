-- backend/sql/init.sql
-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS revenue CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS generate_booking_reference CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    venue VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    county VARCHAR(100) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    poster_url VARCHAR(500),
    ticket_price DECIMAL(10, 2) NOT NULL CHECK (ticket_price >= 0),
    available_tickets INTEGER NOT NULL CHECK (available_tickets >= 0),
    sold_tickets INTEGER DEFAULT 0 CHECK (sold_tickets >= 0),
    category VARCHAR(100),
    age_restriction INTEGER CHECK (age_restriction >= 0),
    organizer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false,
    is_cancelled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (event_date < end_date)
);

-- Standardizing on TIMESTAMPTZ for production (Global Time Consistency)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    number_of_tickets INTEGER NOT NULL CHECK (number_of_tickets > 0),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Set by trigger
    unit_price_at_booking DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Snapshot for audit
    booking_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
    booking_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Production Trigger: Auto-calculate price and check availability
-- Add phone_number to bookings table
ALTER TABLE bookings ADD COLUMN phone_number VARCHAR(20);

-- Update the process_booking_logic trigger to include phone_number
CREATE OR REPLACE FUNCTION process_booking_logic()
RETURNS TRIGGER AS $$
DECLARE
    v_ticket_price DECIMAL(12, 2);
    v_available INTEGER;
BEGIN
    -- 1. Lock the event row for update to prevent race conditions (Overselling)
    SELECT ticket_price, available_tickets 
    INTO v_ticket_price, v_available 
    FROM events 
    WHERE id = NEW.event_id 
    FOR UPDATE;

    -- 2. Check if enough tickets are available
    IF v_available < NEW.number_of_tickets THEN
        RAISE EXCEPTION 'Sold Out: Only % tickets remaining.', v_available;
    END IF;

    -- 3. Validate phone number format (Kenyan format)
    IF NEW.phone_number IS NOT NULL AND NOT NEW.phone_number ~ '^\+254[0-9]{9}$' THEN
        RAISE EXCEPTION 'Invalid phone number format. Use +2547XXXXXXXX';
    END IF;

    -- 4. Automate the math (Ignore whatever total the frontend sent)
    NEW.unit_price_at_booking := v_ticket_price;
    NEW.total_amount := NEW.number_of_tickets * v_ticket_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_booking
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION process_booking_logic();

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    mpesa_transaction_id VARCHAR(50) UNIQUE,
    mpesa_receipt_number VARCHAR(50),
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'successful', 'failed', 'cancelled')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by_admin UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(20) DEFAULT 'mpesa',
    merchant_request_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    result_code VARCHAR(10),
    result_desc VARCHAR(255)
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    qr_code_url VARCHAR(500),
    attendee_name VARCHAR(255),
    attendee_email VARCHAR(255),
    attendee_phone VARCHAR(20),
    is_validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES users(id),
    ticket_status VARCHAR(20) DEFAULT 'active'
        CHECK (ticket_status IN ('active', 'used', 'cancelled', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revenue table
CREATE TABLE revenue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    total_sales DECIMAL(15, 2) DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    total_refunds DECIMAL(15, 2) DEFAULT 0,
    net_revenue DECIMAL(15, 2) DEFAULT 0,
    report_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, report_date)
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_county ON events(county);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_booking ON tickets(booking_id);
CREATE INDEX idx_revenue_event_date ON revenue(event_id, report_date);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_reference := 'TKT-' || 
        TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' ||
        LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_booking_reference BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();


CREATE OR REPLACE FUNCTION update_inventory_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only decrement inventory when status moves to 'confirmed'
    IF (TG_OP = 'UPDATE' AND NEW.booking_status = 'confirmed' AND OLD.booking_status != 'confirmed') THEN
        UPDATE events 
        SET available_tickets = available_tickets - NEW.number_of_tickets,
            sold_tickets = sold_tickets + NEW.number_of_tickets
        WHERE id = NEW.event_id;
    END IF;

    -- If booking is cancelled, return the tickets to the pool
    IF (TG_OP = 'UPDATE' AND NEW.booking_status = 'cancelled' AND OLD.booking_status = 'confirmed') THEN
        UPDATE events 
        SET available_tickets = available_tickets + NEW.number_of_tickets,
            sold_tickets = sold_tickets - NEW.number_of_tickets
        WHERE id = NEW.event_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_management
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_inventory_on_payment();


-- Insert default admin user (password: Admin123!)
INSERT INTO users (email, password_hash, full_name, phone_number, role) 
VALUES (
    'admin@tickethub.co.ke',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.CH3.6Z1z7HfA5.6I5Q7H7q7p6J8X9C', -- Admin123!
    'Mikey Administrator',
    '+254701520870',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample events
INSERT INTO events (
    title, description, venue, location, county, 
    event_date, end_date, ticket_price, available_tickets, 
    category, organizer_id, is_published
) VALUES 
(
    'Nairobi Music Festival',
    'Annual music festival featuring top Kenyan artists',
    'Uhuru Gardens',
    'Langata Road',
    'Nairobi',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP + INTERVAL '8 days',
    2500.00,
    5000,
    'Music',
    (SELECT id FROM users WHERE email = 'admin@tickethub.co.ke'),
    true
),
(
    'Tech Innovators Summit',
    'Gathering of tech entrepreneurs and innovators',
    'KICC',
    'Harambee Avenue',
    'Nairobi',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    CURRENT_TIMESTAMP + INTERVAL '15 days',
    5000.00,
    1000,
    'Technology',
    (SELECT id FROM users WHERE email = 'admin@tickethub.co.ke'),
    true
),
(
    'Mombasa Food Expo',
    'Celebration of coastal cuisine and culture',
    'Sarova Whitesands',
    'Mombasa',
    'Mombasa',
    CURRENT_TIMESTAMP + INTERVAL '21 days',
    CURRENT_TIMESTAMP + INTERVAL '22 days',
    1500.00,
    2000,
    'Food & Drink',
    (SELECT id FROM users WHERE email = 'admin@tickethub.co.ke'),
    true
) ON CONFLICT DO NOTHING;

-- Create a sample client user (password: Client123!)
INSERT INTO users (email, password_hash, full_name, phone_number, role) 
VALUES (
    'client@example.com',
    '$2a$10$8bQZz7Z6Z6Z6Z6Z6Z6Z6Z.CH3.6Z1z7HfA5.6I5Q7H7q7p6J8X9C', -- Client123!
    'John Client',
    '+254711111111',
    'client'
) ON CONFLICT (email) DO NOTHING;