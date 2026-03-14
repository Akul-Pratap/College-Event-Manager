-- LTSU Event Management - Supabase Full Setup (Fresh + Upgrade Safe)
-- Run this in Supabase SQL Editor or as a migration.
-- This file is idempotent: it creates missing objects and patches older schema.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =========================
-- Core Tables
-- =========================

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  hod_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  name text not null,
  roll_no text,
  email text unique not null,
  role text not null,
  secondary_role text,
  department_id uuid references public.departments(id),
  year text,
  branch text,
  section text,
  fcm_token text,
  created_at timestamptz not null default now()
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  department_id uuid references public.departments(id),
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  designation text,
  is_permanent boolean not null default false,
  joined_at timestamptz not null default now()
);

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  request_type text not null,
  status text not null,
  event_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null,
  department_id uuid references public.departments(id),
  is_shared boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz not null,
  start_time timestamptz,
  end_time timestamptz,
  venue_id uuid not null references public.venues(id),
  club_id uuid not null references public.clubs(id),
  department_id uuid not null references public.departments(id),
  payment_type text not null,
  fee integer not null default 0,
  upi_id text,
  status text not null,
  form_open timestamptz,
  form_close timestamptz,
  max_responses integer,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid references public.departments(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_highlights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  winner_name text not null,
  prize text,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  label text not null,
  field_type text not null,
  options jsonb,
  is_required boolean not null default false,
  order_index integer not null default 0,
  validation_rules jsonb,
  placeholder text,
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid references public.departments(id),
  status text not null,
  payment_method text not null,
  payment_status text not null,
  registered_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  field_id uuid not null references public.form_fields(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.users(id),
  department_id uuid references public.departments(id),
  position integer not null,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  department_id uuid references public.departments(id),
  utr_number text unique not null,
  screenshot_url text,
  screenshot_hash text,
  ai_verified boolean not null default false,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.money_collection (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid references public.departments(id),
  year text not null,
  branch text not null,
  section text not null,
  amount_collected integer not null default 0,
  collected_by uuid references public.users(id),
  approved_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  department_id uuid references public.departments(id),
  marked_by uuid not null references public.users(id),
  method text not null,
  "timestamp" timestamptz not null default now()
);

create table if not exists public.duty_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid references public.departments(id),
  name text not null,
  class text not null,
  batch text not null,
  roll_no text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null,
  approved_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid references public.departments(id),
  stage integer not null,
  approver_role text not null,
  approver_id uuid references public.users(id),
  status text not null,
  note text,
  requested_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  department_id uuid references public.departments(id),
  image_url text not null,
  uploaded_by uuid not null references public.users(id),
  caption text,
  type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  department_id uuid references public.departments(id),
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  department_id uuid references public.departments(id),
  event_id uuid references public.events(id),
  trigger_type text not null,
  sent_at timestamptz not null default now(),
  status text not null
);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text,
  ip_address text,
  success boolean not null default false,
  flagged_by_ai boolean not null default false,
  attempted_at timestamptz not null default now()
);

-- =========================
-- Upgrade Patches (for old schema)
-- =========================

alter table if exists public.users add column if not exists name text;
alter table if exists public.users add column if not exists roll_no text;
alter table if exists public.users add column if not exists email text;
alter table if exists public.users add column if not exists role text;
alter table if exists public.users add column if not exists secondary_role text;
alter table if exists public.users add column if not exists department_id uuid references public.departments(id);
alter table if exists public.users add column if not exists year text;
alter table if exists public.users add column if not exists branch text;
alter table if exists public.users add column if not exists section text;
alter table if exists public.users add column if not exists fcm_token text;
alter table if exists public.clubs add column if not exists name text;
alter table if exists public.clubs add column if not exists description text;
alter table if exists public.clubs add column if not exists logo_url text;
alter table if exists public.clubs add column if not exists department_id uuid references public.departments(id);
alter table if exists public.venues add column if not exists name text;
alter table if exists public.venues add column if not exists capacity integer;
alter table if exists public.venues add column if not exists department_id uuid references public.departments(id);
alter table if exists public.venues add column if not exists is_shared boolean default true;
-- Drop NOT NULL on legacy events columns that block our inserts
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='end_date' and is_nullable='NO') then
    execute 'alter table public.events alter column end_date drop not null';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='start_date' and is_nullable='NO') then
    execute 'alter table public.events alter column start_date drop not null';
  end if;
end $$;

alter table if exists public.events add column if not exists venue_id uuid references public.venues(id);
alter table if exists public.events add column if not exists club_id uuid references public.clubs(id);
alter table if exists public.events add column if not exists department_id uuid references public.departments(id);
alter table if exists public.events add column if not exists date timestamptz;
alter table if exists public.events add column if not exists payment_type text;
alter table if exists public.events add column if not exists fee integer default 0;
alter table if exists public.events add column if not exists status text;
alter table if exists public.events add column if not exists upi_id text;
alter table if exists public.events add column if not exists start_time timestamptz;
alter table if exists public.events add column if not exists end_time timestamptz;
alter table if exists public.events add column if not exists form_open timestamptz;
alter table if exists public.events add column if not exists form_close timestamptz;
alter table if exists public.events add column if not exists max_responses integer;
alter table if exists public.events add column if not exists created_by uuid references public.users(id);
alter table if exists public.venue_bookings add column if not exists department_id uuid references public.departments(id);
alter table if exists public.event_highlights add column if not exists department_id uuid references public.departments(id);
alter table if exists public.form_fields add column if not exists department_id uuid references public.departments(id);
alter table if exists public.registrations add column if not exists student_id uuid references public.users(id);
alter table if exists public.registrations add column if not exists department_id uuid references public.departments(id);
alter table if exists public.registrations add column if not exists status text;
alter table if exists public.registrations add column if not exists payment_method text;
alter table if exists public.registrations add column if not exists payment_status text;
alter table if exists public.registrations add column if not exists registered_at timestamptz default now();
alter table if exists public.form_responses add column if not exists department_id uuid references public.departments(id);
alter table if exists public.waitlist add column if not exists department_id uuid references public.departments(id);
alter table if exists public.payments add column if not exists department_id uuid references public.departments(id);
alter table if exists public.money_collection add column if not exists department_id uuid references public.departments(id);
alter table if exists public.attendance add column if not exists department_id uuid references public.departments(id);
alter table if exists public.duty_leaves add column if not exists department_id uuid references public.departments(id);
alter table if exists public.approval_requests add column if not exists department_id uuid references public.departments(id);
alter table if exists public.gallery add column if not exists department_id uuid references public.departments(id);
alter table if exists public.notifications add column if not exists department_id uuid references public.departments(id);
alter table if exists public.email_logs add column if not exists department_id uuid references public.departments(id);

-- Legacy schema compatibility backfills
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'start_date'
  ) then
    execute 'update public.events set date = coalesce(date, start_date, created_at, now()) where date is null';
  else
    execute 'update public.events set date = coalesce(date, created_at, now()) where date is null';
  end if;
end $$;

update public.events
set payment_type = coalesce(payment_type, case when coalesce(fee, 0) > 0 then 'paid' else 'free' end)
where payment_type is null;

update public.events
set status = coalesce(status, 'draft')
where status is null;

do $$
begin
  -- Legacy registrations used user_id instead of student_id
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrations'
      and column_name = 'user_id'
  ) then
    execute '
      update public.registrations
      set student_id = coalesce(student_id, user_id)
      where student_id is null
    ';
  end if;

  -- Legacy registrations used created_at instead of registered_at
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'registrations'
      and column_name = 'created_at'
  ) then
    execute '
      update public.registrations
      set registered_at = coalesce(registered_at, created_at, now())
      where registered_at is null
    ';
  end if;
end $$;

update public.registrations
set status = coalesce(status, 'confirmed')
where status is null;

update public.registrations
set payment_method = coalesce(payment_method, 'not_required')
where payment_method is null;

update public.registrations
set payment_status = coalesce(payment_status, 'not_required')
where payment_status is null;

update public.registrations
set registered_at = coalesce(registered_at, now())
where registered_at is null;

-- =========================
-- Constraints
-- =========================

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
check (role in ('super_admin','hod','faculty_coordinator','class_incharge','organizer','volunteer','cr','student'));

alter table public.users drop constraint if exists users_secondary_role_check;
alter table public.users add constraint users_secondary_role_check
check (secondary_role is null or secondary_role in ('super_admin','hod','faculty_coordinator','class_incharge','organizer','volunteer','cr','student'));

alter table public.events drop constraint if exists events_payment_type_check;
alter table public.events add constraint events_payment_type_check
check (payment_type in ('free','paid','cash'));

alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
check (status in ('draft','pending_approval','live','rejected','completed','cancelled'));

alter table public.club_join_requests drop constraint if exists club_join_requests_request_type_check;
alter table public.club_join_requests add constraint club_join_requests_request_type_check
check (request_type in ('permanent','event_only'));

alter table public.club_join_requests drop constraint if exists club_join_requests_status_check;
alter table public.club_join_requests add constraint club_join_requests_status_check
check (status in ('pending','approved','rejected'));

alter table public.registrations drop constraint if exists registrations_status_check;
alter table public.registrations add constraint registrations_status_check
check (status in ('confirmed','cancelled','waitlisted','payment_rejected'));

alter table public.registrations drop constraint if exists registrations_payment_method_check;
alter table public.registrations add constraint registrations_payment_method_check
check (payment_method in ('upi','cash','not_required'));

alter table public.registrations drop constraint if exists registrations_payment_status_check;
alter table public.registrations add constraint registrations_payment_status_check
check (payment_status in ('pending','approved','rejected','not_required'));

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
check (status in ('pending','approved','rejected','manual_review'));

alter table public.attendance drop constraint if exists attendance_method_check;
alter table public.attendance add constraint attendance_method_check
check (method in ('qr_scan','manual'));

alter table public.duty_leaves drop constraint if exists duty_leaves_status_check;
alter table public.duty_leaves add constraint duty_leaves_status_check
check (status in ('pending','approved','rejected'));

alter table public.approval_requests drop constraint if exists approval_requests_stage_check;
alter table public.approval_requests add constraint approval_requests_stage_check
check (stage in (1,2));

alter table public.approval_requests drop constraint if exists approval_requests_approver_role_check;
alter table public.approval_requests add constraint approval_requests_approver_role_check
check (approver_role in ('faculty_coordinator','hod'));

alter table public.approval_requests drop constraint if exists approval_requests_status_check;
alter table public.approval_requests add constraint approval_requests_status_check
check (status in ('pending','approved','rejected'));

alter table public.gallery drop constraint if exists gallery_type_check;
alter table public.gallery add constraint gallery_type_check
check (type in ('event_photo','notice','winner'));

alter table public.email_logs drop constraint if exists email_logs_status_check;
alter table public.email_logs add constraint email_logs_status_check
check (status in ('sent','failed'));

-- =========================
-- Uniqueness for App Logic
-- =========================

create unique index if not exists uq_registrations_student_event
  on public.registrations (student_id, event_id);

create unique index if not exists uq_waitlist_event_student
  on public.waitlist (event_id, student_id);

create unique index if not exists uq_attendance_registration
  on public.attendance (registration_id);

create unique index if not exists uq_money_collection_event_class
  on public.money_collection (event_id, year, branch, section);

create unique index if not exists uq_club_members_club_user
  on public.club_members (club_id, user_id);

-- =========================
-- Performance Indexes
-- =========================

create index if not exists idx_users_department on public.users (department_id);
create index if not exists idx_users_role on public.users (role);
create index if not exists idx_users_secondary_role on public.users (secondary_role);
create index if not exists idx_events_department on public.events (department_id);
create index if not exists idx_events_status on public.events (status);
create index if not exists idx_events_date on public.events (date);
create index if not exists idx_approvals_event on public.approval_requests (event_id);
create index if not exists idx_approvals_role_status on public.approval_requests (approver_role, status);
create index if not exists idx_registrations_event on public.registrations (event_id);
create index if not exists idx_registrations_student on public.registrations (student_id);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_money_collection_event on public.money_collection (event_id);
create index if not exists idx_login_attempts_user_time on public.login_attempts (clerk_user_id, attempted_at desc);
create index if not exists idx_login_attempts_ip_time on public.login_attempts (ip_address, attempted_at desc);

-- =========================
-- Seed (Safe to re-run)
-- =========================

insert into public.departments (name, code)
select 'Computer Science and Engineering', 'CSE'
where not exists (
  select 1 from public.departments where code = 'CSE'
);

insert into public.users (clerk_id, name, roll_no, email, role, department_id, year, branch, section)
select *
from (
  values
    ('temp_super_admin', 'Super Admin', null, 'admin.test@ltsu.ac.in', 'super_admin', null::uuid, null, null, null),
    ('temp_hod', 'HOD User', null, 'hod.test@ltsu.ac.in', 'hod', (select id from public.departments where code='CSE' limit 1), null, null, null),
    ('temp_faculty', 'Faculty Coordinator', null, 'faculty.test@ltsu.ac.in', 'faculty_coordinator', (select id from public.departments where code='CSE' limit 1), null, null, null),
    ('temp_class_incharge', 'Class Incharge', null, 'classincharge.test@ltsu.ac.in', 'class_incharge', (select id from public.departments where code='CSE' limit 1), null, null, null),
    ('temp_organizer', 'Organizer User', 'ORG001', 'organizer.test@ltsu.ac.in', 'organizer', (select id from public.departments where code='CSE' limit 1), '3', 'CSE', 'A'),
    ('temp_volunteer', 'Volunteer User', 'VOL001', 'volunteer.test@ltsu.ac.in', 'volunteer', (select id from public.departments where code='CSE' limit 1), '2', 'CSE', 'A'),
    ('temp_cr', 'CR User', 'CR001', 'cr.test@ltsu.ac.in', 'student', (select id from public.departments where code='CSE' limit 1), '2', 'CSE', 'A'),
    ('temp_student', 'Student User', 'STU001', 'student.test@ltsu.ac.in', 'student', (select id from public.departments where code='CSE' limit 1), '2', 'CSE', 'A')
) as t(clerk_id, name, roll_no, email, role, department_id, year, branch, section)
where not exists (
  select 1 from public.users u where u.email = t.email
);

update public.users
set secondary_role = 'cr'
where email = 'cr.test@ltsu.ac.in' and secondary_role is distinct from 'cr';

insert into public.clubs (name, description, logo_url, department_id)
select 'CSE Coding Club', 'Default test club', null, d.id
from public.departments d
where d.code = 'CSE'
on conflict do nothing;

insert into public.venues (name, capacity, department_id, is_shared)
select 'Main Auditorium', 500, d.id, true
from public.departments d
where d.code = 'CSE'
on conflict do nothing;

insert into public.events (
  title, description, date, start_time, end_time,
  venue_id, club_id, department_id, payment_type, fee, upi_id,
  status, form_open, form_close, max_responses, created_by
)
select
  'Tech Symposium 2026',
  'Default live event for setup verification',
  now() + interval '7 day',
  now() + interval '7 day',
  now() + interval '7 day' + interval '3 hour',
  (select id from public.venues where name='Main Auditorium' limit 1),
  (select id from public.clubs where name='CSE Coding Club' limit 1),
  (select id from public.departments where code='CSE' limit 1),
  'paid',
  100,
  'csecodingclub@upi',
  'live',
  now() - interval '1 day',
  now() + interval '5 day',
  300,
  (select id from public.users where email='organizer.test@ltsu.ac.in' limit 1)
where not exists (
  select 1 from public.events where title='Tech Symposium 2026'
);

insert into public.venue_bookings (venue_id, event_id, department_id, start_time, end_time, status)
select
  e.venue_id,
  e.id,
  e.department_id,
  e.start_time,
  e.end_time,
  'confirmed'
from public.events e
where e.title = 'Tech Symposium 2026'
and not exists (
  select 1 from public.venue_bookings vb where vb.event_id = e.id
);

with mc_source as (
  select
    e.id as event_id,
    e.department_id,
    '2'::text as year,
    'CSE'::text as branch,
    'A'::text as section,
    5000::integer as amount_collected,
    (select id from public.users where email='cr.test@ltsu.ac.in' limit 1) as collected_by,
    (select id from public.users where email='faculty.test@ltsu.ac.in' limit 1) as approved_by
  from public.events e
  where e.title = 'Tech Symposium 2026'
)
update public.money_collection m
set
  amount_collected = s.amount_collected,
  collected_by = s.collected_by,
  approved_by = s.approved_by,
  updated_at = now()
from mc_source s
where m.event_id = s.event_id
  and m.year = s.year
  and m.branch = s.branch
  and m.section = s.section;

insert into public.money_collection (
  event_id, department_id, year, branch, section, amount_collected, collected_by, approved_by
)
select
  s.event_id,
  s.department_id,
  s.year,
  s.branch,
  s.section,
  s.amount_collected,
  s.collected_by,
  s.approved_by
from (
  select
    e.id as event_id,
    e.department_id,
    '2'::text as year,
    'CSE'::text as branch,
    'A'::text as section,
    5000::integer as amount_collected,
    (select id from public.users where email='cr.test@ltsu.ac.in' limit 1) as collected_by,
    (select id from public.users where email='faculty.test@ltsu.ac.in' limit 1) as approved_by
  from public.events e
  where e.title = 'Tech Symposium 2026'
) s
where not exists (
  select 1
  from public.money_collection m
  where m.event_id = s.event_id
    and m.year = s.year
    and m.branch = s.branch
    and m.section = s.section
);

-- =========================
-- Verification
-- =========================

-- select table_name from information_schema.tables where table_schema='public' order by 1;
-- select email, role, secondary_role from public.users where email like '%.test@ltsu.ac.in' order by email;
-- select title, status, payment_type, fee, upi_id from public.events where title='Tech Symposium 2026';
