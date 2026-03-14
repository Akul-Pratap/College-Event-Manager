-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    hod_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    roll_no TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'hod', 'faculty_coordinator', 'class_incharge', 'organizer', 'volunteer', 'cr', 'student')),
    department_id UUID REFERENCES departments(id),
    year TEXT,
    branch TEXT,
    section TEXT,
    fcm_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clubs
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    department_id UUID REFERENCES departments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club Members
CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id),
    user_id UUID NOT NULL REFERENCES users(id),
    designation TEXT,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club Join Requests
CREATE TABLE club_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id),
    user_id UUID NOT NULL REFERENCES users(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('permanent', 'event_only')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    event_id UUID, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Venues (No department_id requirement per spec for some reason, wait: specs say "Every table except venues should have a department_id")
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    capacity INT NOT NULL,
    department_id UUID REFERENCES departments(id), -- Included as nullable just in case it's specifically assigned
    is_shared BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    venue_id UUID NOT NULL REFERENCES venues(id),
    club_id UUID NOT NULL REFERENCES clubs(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('free', 'paid', 'cash')),
    fee INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'live', 'rejected', 'completed', 'cancelled')),
    form_open TIMESTAMPTZ,
    form_close TIMESTAMPTZ,
    max_responses INT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Venue Bookings
CREATE TABLE venue_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Event Highlights
CREATE TABLE event_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    winner_name TEXT NOT NULL,
    prize TEXT,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form Fields
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    options JSONB,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT NOT NULL DEFAULT 0,
    validation_rules JSONB,
    placeholder TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form Responses
CREATE TABLE form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL,
    field_id UUID NOT NULL REFERENCES form_fields(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registrations
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'waitlisted', 'payment_rejected')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'cash', 'not_required')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'approved', 'rejected', 'not_required')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE form_responses ADD CONSTRAINT fk_reg FOREIGN KEY (registration_id) REFERENCES registrations(id);

-- Waitlist
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    student_id UUID NOT NULL REFERENCES users(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    position INT NOT NULL,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    utr_number TEXT NOT NULL UNIQUE,
    screenshot_url TEXT,
    screenshot_hash TEXT,
    ai_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'manual_review')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Money Collection
CREATE TABLE money_collection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    year TEXT NOT NULL,
    branch TEXT NOT NULL,
    section TEXT NOT NULL,
    amount_collected INT NOT NULL DEFAULT 0,
    collected_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    marked_by UUID NOT NULL REFERENCES users(id),
    method TEXT NOT NULL CHECK (method IN ('qr_scan', 'manual')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duty Leaves
CREATE TABLE duty_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    batch TEXT NOT NULL,
    roll_no TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approval Requests
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    stage INT NOT NULL CHECK (stage IN (1, 2)),
    approver_role TEXT NOT NULL CHECK (approver_role IN ('faculty_coordinator', 'hod')),
    approver_id UUID REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gallery
CREATE TABLE gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    image_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    caption TEXT,
    type TEXT NOT NULL CHECK (type IN ('event_photo', 'notice', 'winner')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Logs
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    department_id UUID NOT NULL REFERENCES departments(id),
    event_id UUID REFERENCES events(id),
    trigger_type TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed'))
);

-- Login Attempts
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    department_id UUID REFERENCES departments(id),
    ip_address TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    flagged_by_ai BOOLEAN NOT NULL DEFAULT FALSE
);

-- ENABLE RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- SUPER ADMIN BYPASS
CREATE POLICY super_admin_bypass ON departments FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON users FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON clubs FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON club_members FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON club_join_requests FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON venues FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON events FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON venue_bookings FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON event_highlights FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON form_fields FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON form_responses FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON registrations FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON waitlist FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON payments FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON money_collection FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON attendance FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON duty_leaves FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON approval_requests FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON gallery FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON notifications FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON email_logs FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');
CREATE POLICY super_admin_bypass ON login_attempts FOR ALL USING ((SELECT role FROM users WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin');

-- SEED DATA
INSERT INTO departments (name, code) VALUES
('Computer Science', 'CS'),
('Electronics', 'EC'),
('Mechanical', 'ME'),
('Civil', 'CE'),
('Management', 'MBA');

INSERT INTO venues (name, capacity, is_shared) VALUES
('Main Auditorium', 500, true),
('Seminar Hall A', 100, true),
('Seminar Hall B', 100, true),
('Sports Ground', 1000, true),
('Computer Lab 1', 60, false);
