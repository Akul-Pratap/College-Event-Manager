-- Full dummy dashboard seed (safe to rerun)
--
-- Usage:
-- 1) Run cleanup_dummy_test_users.sql if you want a hard reset.
-- 2) Run this file in Supabase SQL Editor.
--
-- Notes:
-- - These rows are tagged with temp_ clerk IDs and [Dummy] titles/names.
-- - Passwords are managed by Clerk, not stored in public.users.
-- - Suggested Clerk password for these emails: LTSU@12345

begin;

-- Ensure baseline departments exist.
insert into public.departments (name, code)
select 'Computer Science', 'CS'
where not exists (select 1 from public.departments where code = 'CS');

insert into public.departments (name, code)
select 'Electronics', 'EC'
where not exists (select 1 from public.departments where code = 'EC');

insert into public.departments (name, code)
select 'Mechanical', 'ME'
where not exists (select 1 from public.departments where code = 'ME');

insert into public.departments (name, code)
select 'Civil', 'CE'
where not exists (select 1 from public.departments where code = 'CE');

insert into public.departments (name, code)
select 'Management', 'MBA'
where not exists (select 1 from public.departments where code = 'MBA');

-- Rerun-safe cleanup for previously seeded dummy records.
delete from public.form_responses
where registration_id in (
  select r.id from public.registrations r
  join public.events e on e.id = r.event_id
  where e.title like '[Dummy] %'
)
or field_id in (
  select id from public.form_fields where event_id in (
    select id from public.events where title like '[Dummy] %'
  )
);

delete from public.attendance
where registration_id in (
  select id from public.registrations where event_id in (
    select id from public.events where title like '[Dummy] %'
  )
)
or marked_by in (select id from public.users where clerk_id like 'temp_%');

delete from public.payments
where registration_id in (
  select id from public.registrations where event_id in (
    select id from public.events where title like '[Dummy] %'
  )
);

delete from public.waitlist
where event_id in (select id from public.events where title like '[Dummy] %')
   or student_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.money_collection
where event_id in (select id from public.events where title like '[Dummy] %')
   or collected_by in (select id from public.users where clerk_id like 'temp_%')
   or approved_by in (select id from public.users where clerk_id like 'temp_%');

delete from public.duty_leaves
where event_id in (select id from public.events where title like '[Dummy] %')
   or user_id in (select id from public.users where clerk_id like 'temp_%')
   or approved_by in (select id from public.users where clerk_id like 'temp_%');

delete from public.approval_requests
where event_id in (select id from public.events where title like '[Dummy] %')
   or approver_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.gallery
where event_id in (select id from public.events where title like '[Dummy] %')
   or uploaded_by in (select id from public.users where clerk_id like 'temp_%')
   or caption like '[Dummy] %';

delete from public.event_highlights
where event_id in (select id from public.events where title like '[Dummy] %')
   or winner_name like 'Dummy %'
   or description like '[Dummy] %';

delete from public.venue_bookings
where event_id in (select id from public.events where title like '[Dummy] %')
   or venue_id in (select id from public.venues where name like '[Dummy] %');

delete from public.form_fields
where event_id in (select id from public.events where title like '[Dummy] %');

delete from public.registrations
where event_id in (select id from public.events where title like '[Dummy] %')
   or student_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.club_join_requests
where club_id in (select id from public.clubs where name like '[Dummy] %')
   or user_id in (select id from public.users where clerk_id like 'temp_%')
   or event_id in (select id from public.events where title like '[Dummy] %');

delete from public.club_members
where club_id in (select id from public.clubs where name like '[Dummy] %')
   or user_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.notifications
where user_id in (select id from public.users where clerk_id like 'temp_%')
   or message like '[Dummy] %';

delete from public.email_logs
where user_id in (select id from public.users where clerk_id like 'temp_%')
   or event_id in (select id from public.events where title like '[Dummy] %');

delete from public.login_attempts
where clerk_user_id like 'temp_%';

delete from public.role_delegations
where granter_user_id in (select id from public.users where clerk_id like 'temp_%')
   or grantee_user_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.events where title like '[Dummy] %';
delete from public.clubs where name like '[Dummy] %';
delete from public.venues where name like '[Dummy] %';
delete from public.users where clerk_id like 'temp_%';

-- Seed users.
with cs_department as (
  select id from public.departments where code = 'CS' limit 1
), user_rows as (
  select * from (
    values
      ('temp_student',        'student.test@ltsu.ac.in',       'Test Student',   'student',             null, '21CS001', '2', 'CSE', 'A'),
      ('temp_organizer',      'organizer.test@ltsu.ac.in',     'Test Organizer', 'organizer',           null, 'ORG001',   '3', 'CSE', 'A'),
      ('temp_volunteer',      'volunteer.test@ltsu.ac.in',     'Test Volunteer', 'volunteer',           null, 'VOL001',   '2', 'CSE', 'A'),
      ('temp_hod',            'hod.test@ltsu.ac.in',           'Test HOD',       'hod',                 null, null,       null, null,  null),
      ('temp_faculty',        'faculty.test@ltsu.ac.in',       'Test Faculty',   'faculty_coordinator', null, null,       null, null,  null),
      ('temp_class_incharge', 'classincharge.test@ltsu.ac.in', 'Test CI',        'class_incharge',      null, null,       null, null,  null),
      ('temp_cr',             'cr.test@ltsu.ac.in',            'Test CR',        'cr',                  null, 'CR001',    '2', 'CSE', 'A'),
      ('temp_admin',          'admin.test@ltsu.ac.in',         'Test Admin',     'super_admin',         null, null,       null, null,  null)
  ) as t(clerk_id, email, name, role, secondary_role, roll_no, year, branch, section)
)
insert into public.users (
  clerk_id, name, email, role, secondary_role, department_id, roll_no, year, branch, section
)
select
  u.clerk_id,
  u.name,
  u.email,
  u.role,
  u.secondary_role,
  (select id from cs_department),
  u.roll_no,
  u.year,
  u.branch,
  u.section
from user_rows u;

-- Link HOD to CS department.
update public.departments
set hod_id = (select id from public.users where clerk_id = 'temp_hod')
where code = 'CS';

-- Clubs and memberships.
insert into public.clubs (name, description, logo_url, department_id)
select '[Dummy] Coding Club', 'Dummy coding club for dashboard previews.', 'https://picsum.photos/seed/ltsu-coding/240/240', d.id
from public.departments d where d.code = 'CS';

insert into public.clubs (name, description, logo_url, department_id)
select '[Dummy] Robotics Club', 'Dummy robotics club for organizer and student pages.', 'https://picsum.photos/seed/ltsu-robotics/240/240', d.id
from public.departments d where d.code = 'CS';

insert into public.club_members (club_id, user_id, designation, is_permanent)
select c.id, u.id, x.designation, x.is_permanent
from (
  values
    ('[Dummy] Coding Club', 'temp_organizer', 'Lead Organizer', true),
    ('[Dummy] Coding Club', 'temp_faculty', 'Faculty Mentor', true),
    ('[Dummy] Coding Club', 'temp_student', 'Member', true),
    ('[Dummy] Robotics Club', 'temp_volunteer', 'Volunteer', true),
    ('[Dummy] Robotics Club', 'temp_cr', 'Student Representative', true)
) as x(club_name, clerk_id, designation, is_permanent)
join public.clubs c on c.name = x.club_name
join public.users u on u.clerk_id = x.clerk_id;

insert into public.club_join_requests (club_id, user_id, request_type, status, event_id)
select c.id, u.id, 'permanent', 'pending', null
from public.clubs c
join public.users u on u.clerk_id = 'temp_student'
where c.name = '[Dummy] Robotics Club';

-- Venues.
insert into public.venues (name, capacity, department_id, is_shared)
select '[Dummy] Innovation Hall', 350, d.id, true
from public.departments d where d.code = 'CS';

insert into public.venues (name, capacity, department_id, is_shared)
select '[Dummy] Seminar Hall Alpha', 120, d.id, true
from public.departments d where d.code = 'CS';

-- Events.
insert into public.events (
  title, description, date, start_time, end_time, venue_id, club_id, department_id,
  payment_type, fee, upi_id, status, form_open, form_close, max_responses, created_by
)
select
  '[Dummy] AI Hackathon 2026',
  'Dummy flagship paid event used across student, organizer, payment, gallery, and public detail pages.',
  now() + interval '10 days',
  now() + interval '10 days 02 hours',
  now() + interval '10 days 10 hours',
  v.id,
  c.id,
  d.id,
  'paid',
  250,
  'ltsu-events@upi',
  'live',
  now() - interval '1 day',
  now() + interval '7 days',
  300,
  u.id
from public.venues v
join public.clubs c on c.name = '[Dummy] Coding Club'
join public.departments d on d.code = 'CS'
join public.users u on u.clerk_id = 'temp_organizer'
where v.name = '[Dummy] Innovation Hall';

insert into public.events (
  title, description, date, start_time, end_time, venue_id, club_id, department_id,
  payment_type, fee, upi_id, status, form_open, form_close, max_responses, created_by
)
select
  '[Dummy] Robotics Workshop',
  'Dummy pending approval event for HOD approval and organizer creation flows.',
  now() + interval '14 days',
  now() + interval '14 days 03 hours',
  now() + interval '14 days 06 hours',
  v.id,
  c.id,
  d.id,
  'free',
  0,
  null,
  'pending_approval',
  now(),
  now() + interval '12 days',
  80,
  u.id
from public.venues v
join public.clubs c on c.name = '[Dummy] Robotics Club'
join public.departments d on d.code = 'CS'
join public.users u on u.clerk_id = 'temp_organizer'
where v.name = '[Dummy] Seminar Hall Alpha';

insert into public.events (
  title, description, date, start_time, end_time, venue_id, club_id, department_id,
  payment_type, fee, upi_id, status, form_open, form_close, max_responses, created_by
)
select
  '[Dummy] Placement Briefing',
  'Dummy completed event used for highlights, attendance, and gallery previews.',
  now() - interval '7 days',
  now() - interval '7 days 04 hours',
  now() - interval '7 days 02 hours',
  v.id,
  c.id,
  d.id,
  'free',
  0,
  null,
  'completed',
  now() - interval '15 days',
  now() - interval '8 days',
  150,
  u.id
from public.venues v
join public.clubs c on c.name = '[Dummy] Coding Club'
join public.departments d on d.code = 'CS'
join public.users u on u.clerk_id = 'temp_faculty'
where v.name = '[Dummy] Seminar Hall Alpha';

insert into public.events (
  title, description, date, start_time, end_time, venue_id, club_id, department_id,
  payment_type, fee, upi_id, status, form_open, form_close, max_responses, created_by
)
select
  '[Dummy] NSS Community Drive',
  'Dummy cancelled event for status coverage.',
  now() + interval '21 days',
  now() + interval '21 days 01 hours',
  now() + interval '21 days 04 hours',
  v.id,
  c.id,
  d.id,
  'cash',
  50,
  null,
  'cancelled',
  now() - interval '2 days',
  now() + interval '15 days',
  100,
  u.id
from public.venues v
join public.clubs c on c.name = '[Dummy] Robotics Club'
join public.departments d on d.code = 'CS'
join public.users u on u.clerk_id = 'temp_organizer'
where v.name = '[Dummy] Innovation Hall';

insert into public.venue_bookings (venue_id, event_id, department_id, start_time, end_time, status)
select e.venue_id, e.id, e.department_id, e.start_time, e.end_time, 'confirmed'
from public.events e
where e.title like '[Dummy] %';

-- Approval workflow rows.
insert into public.approval_requests (event_id, department_id, stage, approver_role, approver_id, status, note)
select e.id, e.department_id, 1, 'hod', h.id, case when e.status = 'pending_approval' then 'pending' else 'approved' end,
  '[Dummy] Auto-seeded approval request.'
from public.events e
join public.users h on h.clerk_id = 'temp_hod'
where e.title in ('[Dummy] Robotics Workshop', '[Dummy] AI Hackathon 2026');

-- Form fields.
insert into public.form_fields (event_id, department_id, label, field_type, options, is_required, order_index, validation_rules, placeholder)
select e.id, e.department_id, 'GitHub Profile', 'text', null, true, 1, '{"pattern":"^https://"}'::jsonb, 'https://github.com/username'
from public.events e where e.title = '[Dummy] AI Hackathon 2026';

insert into public.form_fields (event_id, department_id, label, field_type, options, is_required, order_index, validation_rules, placeholder)
select e.id, e.department_id, 'Team Size', 'select', '["1","2","3","4"]'::jsonb, true, 2, null, null
from public.events e where e.title = '[Dummy] AI Hackathon 2026';

insert into public.form_fields (event_id, department_id, label, field_type, options, is_required, order_index, validation_rules, placeholder)
select e.id, e.department_id, 'Experience Level', 'select', '["Beginner","Intermediate","Advanced"]'::jsonb, true, 1, null, null
from public.events e where e.title = '[Dummy] Robotics Workshop';

-- Registrations and responses.
insert into public.registrations (student_id, event_id, department_id, status, payment_method, payment_status)
select u.id, e.id, e.department_id, 'registered', 'upi', 'verified'
from public.users u
join public.events e on e.title = '[Dummy] AI Hackathon 2026'
where u.clerk_id = 'temp_student';

insert into public.registrations (student_id, event_id, department_id, status, payment_method, payment_status)
select u.id, e.id, e.department_id, 'registered', 'free', 'not_required'
from public.users u
join public.events e on e.title = '[Dummy] Placement Briefing'
where u.clerk_id = 'temp_cr';

insert into public.registrations (student_id, event_id, department_id, status, payment_method, payment_status)
select u.id, e.id, e.department_id, 'waitlisted', 'free', 'not_required'
from public.users u
join public.events e on e.title = '[Dummy] Robotics Workshop'
where u.clerk_id = 'temp_volunteer';

insert into public.form_responses (registration_id, field_id, department_id, answer)
select r.id, f.id, e.department_id,
  case when f.label = 'GitHub Profile' then 'https://github.com/test-student' else '3' end
from public.registrations r
join public.events e on e.id = r.event_id
join public.form_fields f on f.event_id = e.id
where e.title = '[Dummy] AI Hackathon 2026'
  and r.student_id = (select id from public.users where clerk_id = 'temp_student');

insert into public.waitlist (event_id, student_id, department_id, position)
select e.id, u.id, e.department_id, 1
from public.events e
join public.users u on u.clerk_id = 'temp_volunteer'
where e.title = '[Dummy] Robotics Workshop';

insert into public.payments (registration_id, department_id, utr_number, screenshot_url, screenshot_hash, ai_verified, status)
select r.id, r.department_id, 'DUMMYUTR001', 'https://picsum.photos/seed/ltsu-payment/900/1400', 'dummyhash001', true, 'verified'
from public.registrations r
join public.events e on e.id = r.event_id
where e.title = '[Dummy] AI Hackathon 2026'
  and r.student_id = (select id from public.users where clerk_id = 'temp_student');

insert into public.money_collection (event_id, department_id, year, branch, section, amount_collected, collected_by, approved_by)
select e.id, e.department_id, '2', 'CSE', 'A', 12500,
  (select id from public.users where clerk_id = 'temp_cr'),
  (select id from public.users where clerk_id = 'temp_class_incharge')
from public.events e
where e.title = '[Dummy] AI Hackathon 2026';

insert into public.attendance (registration_id, department_id, marked_by, method)
select r.id, r.department_id,
  (select id from public.users where clerk_id = 'temp_volunteer'),
  'qr'
from public.registrations r
join public.events e on e.id = r.event_id
where e.title = '[Dummy] Placement Briefing';

insert into public.duty_leaves (user_id, event_id, department_id, name, class, batch, roll_no, date, start_time, end_time, status, approved_by)
select
  u.id,
  e.id,
  e.department_id,
  u.name,
  'B.Tech CSE',
  coalesce(u.year, '2'),
  coalesce(u.roll_no, 'NA'),
  (e.date at time zone 'utc')::date,
  '09:00',
  '13:00',
  'approved',
  (select id from public.users where clerk_id = 'temp_faculty')
from public.users u
join public.events e on e.title = '[Dummy] AI Hackathon 2026'
where u.clerk_id in ('temp_student', 'temp_cr');

-- Images and highlights.
insert into public.event_highlights (event_id, department_id, winner_name, prize, image_url, description)
select e.id, e.department_id, 'Dummy Winning Team', '1st Prize', 'https://picsum.photos/seed/ltsu-highlight/1200/800', '[Dummy] Winning team announcement card.'
from public.events e where e.title = '[Dummy] Placement Briefing';

insert into public.gallery (event_id, department_id, image_url, uploaded_by, caption, type)
select e.id, e.department_id, 'https://picsum.photos/seed/ltsu-hackathon-hero/1400/900',
  (select id from public.users where clerk_id = 'temp_organizer'),
  '[Dummy] Hackathon hero image', 'event_photo'
from public.events e where e.title = '[Dummy] AI Hackathon 2026';

insert into public.gallery (event_id, department_id, image_url, uploaded_by, caption, type)
select e.id, e.department_id, 'https://picsum.photos/seed/ltsu-workshop-gallery/1400/900',
  (select id from public.users where clerk_id = 'temp_organizer'),
  '[Dummy] Robotics workshop promo image', 'poster'
from public.events e where e.title = '[Dummy] Robotics Workshop';

-- Notifications, email logs, login attempts, delegation.
insert into public.notifications (user_id, department_id, type, message, is_read)
select u.id, u.department_id, 'event_update', '[Dummy] Your Hackathon registration is confirmed.', false
from public.users u where u.clerk_id = 'temp_student';

insert into public.notifications (user_id, department_id, type, message, is_read)
select u.id, u.department_id, 'approval', '[Dummy] Robotics Workshop is awaiting HOD approval.', false
from public.users u where u.clerk_id = 'temp_hod';

insert into public.notifications (user_id, department_id, type, message, is_read)
select u.id, u.department_id, 'collection', '[Dummy] Money collection updated for AI Hackathon 2026.', true
from public.users u where u.clerk_id = 'temp_class_incharge';

insert into public.email_logs (user_id, department_id, event_id, trigger_type, status)
select
  (select id from public.users where clerk_id = 'temp_student'),
  e.department_id,
  e.id,
  'registration_confirmation',
  'sent'
from public.events e where e.title = '[Dummy] AI Hackathon 2026';

insert into public.login_attempts (clerk_user_id, ip_address, success, flagged_by_ai)
values
  ('temp_student', '127.0.0.1', true, false),
  ('temp_organizer', '127.0.0.1', true, false),
  ('temp_admin', '127.0.0.1', false, true);

insert into public.role_delegations (department_id, granter_user_id, grantee_user_id, permission_type, active, expires_at)
select
  d.id,
  ci.id,
  cr.id,
  'sensitive_data_write',
  true,
  now() + interval '30 days'
from public.departments d
join public.users ci on ci.clerk_id = 'temp_class_incharge'
join public.users cr on cr.clerk_id = 'temp_cr'
where d.code = 'CS';

commit;

-- Quick checks
select id, clerk_id, email, role, year, branch, section
from public.users
where clerk_id like 'temp_%'
order by email;

select id, title, status, payment_type, fee
from public.events
where title like '[Dummy] %'
order by date;
