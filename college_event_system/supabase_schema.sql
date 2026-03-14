-- College Event System Database Schema (22 Tables)
-- Run this in your Supabase SQL Editor

-- 1. Organizations/Colleges
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL, -- e.g., 'CSE', 'ECE'
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (Links to Clerk Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL, -- student, organizer, hod, etc.
    department_id UUID REFERENCES departments(id),
    year_of_study INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Clubs
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES clubs(id),
    organizer_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50), -- technical, cultural, sports
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    venue VARCHAR(255),
    is_public BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_approval, approved, rejected, published, completed
    budget DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Event Approvals
CREATE TABLE event_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    approver_id UUID REFERENCES users(id), -- HOD
    status VARCHAR(50) NOT NULL, -- pending, approved, rejected
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Event Forms (Dynamic Forms built with Dnd-Kit)
CREATE TABLE event_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    fields_schema JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Event Registrations
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    user_id UUID REFERENCES users(id),
    form_data JSONB, -- Answers to the custom event form
    status VARCHAR(50) DEFAULT 'registered', -- registered, attended, cancelled
    ticket_qr_code VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Scannable Tickets (For Volunteer App)
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID REFERENCES registrations(id),
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    scanned_by UUID REFERENCES users(id), -- Volunteer who scanned
    scanned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID REFERENCES registrations(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, successful, failed, verified
    transaction_id VARCHAR(255),
    screenshot_url TEXT,
    verified_by UUID REFERENCES users(id), -- Class Incharge or Organizer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Duty Leaves (OD)
CREATE TABLE duty_leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_id UUID REFERENCES events(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id), -- Faculty
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    approved_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id UUID REFERENCES budgets(id),
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Event Venues
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    capacity INTEGER,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Venue Bookings
CREATE TABLE venue_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(id),
    event_id UUID REFERENCES events(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Event Feedback
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    user_id UUID REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Volunteers
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_id UUID REFERENCES events(id),
    role_description VARCHAR(255),
    status VARCHAR(50) DEFAULT 'assigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Emergency Alerts (Panic Button Log)
CREATE TABLE emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    triggered_by UUID REFERENCES users(id),
    message TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Waitlist
CREATE TABLE waitlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id),
    user_id UUID REFERENCES users(id),
    position INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, promoted, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. App Notifications (Firebase Token mapping)
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    fcm_token TEXT NOT NULL,
    device_type VARCHAR(50),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. AI Recommendations Log
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    recommended_events JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL, -- e.g., 'created_event', 'approved_budget'
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES --

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Examples of required RLS Policies:
-- 1. Anyone can view public events
CREATE POLICY "Public events are viewable by everyone" ON events
    FOR SELECT USING (is_public = true AND status = 'published');

-- 2. Organizers can fully manage their own events
CREATE POLICY "Organizers manage their events" ON events
    FOR ALL USING (organizer_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
    ));

-- 3. Students can view their own registrations
CREATE POLICY "Users view own registrations" ON registrations
    FOR SELECT USING (user_id IN (
        SELECT id FROM users WHERE clerk_id = auth.uid()::text
    ));

-- 4. Volunteers can scan and update tickets for events they are assigned to
CREATE POLICY "Volunteers update tickets" ON tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM volunteers v 
            JOIN users u ON v.user_id = u.id 
            WHERE u.clerk_id = auth.uid()::text
        )
    );

-- 5. Class incharge can view payments for their department
CREATE POLICY "Class incharge views dept payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.clerk_id = auth.uid()::text 
            AND u.role = 'class_incharge'
        )
    );

-- (Remember to create an auth trigger to auto-populate the users table from Clerk, or sync from Clerk webhooks)
