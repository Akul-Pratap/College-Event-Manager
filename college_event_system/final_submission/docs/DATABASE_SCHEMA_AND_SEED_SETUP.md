# Database Schema and Required Seed Data Setup (Step-by-Step)

This guide gives you exact SQL steps to create schema instances and required data entries for testing the LTSU Event Management System.

Applies to schema in [college_event_system/supabase_setup.sql](../../supabase_setup.sql).

## 1. Open Supabase SQL Editor

1. Open your Supabase project.
2. Go to SQL Editor.
3. Create a new query.

## 2. Run Core Extensions

Run this first:

```sql
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
```

## 3. Create Tables (Schema Instances)

Option A (recommended):
- Copy full content of [college_event_system/supabase_setup.sql](../../supabase_setup.sql) into SQL Editor.
- Run once.

Option B:
- Run table-by-table from the same file.

## 4. Verify All Required Tables Exist

Run:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'departments','users','clubs','club_members','club_join_requests',
    'venues','events','venue_bookings','event_highlights','form_fields',
    'form_responses','registrations','waitlist','payments','money_collection',
    'attendance','duty_leaves','approval_requests','gallery','notifications','email_logs'
  )
order by table_name;
```

You should see all tables listed.

## 5. Insert Minimum Required Base Data

### 5.1 Department

```sql
insert into departments (name, code)
values ('Computer Science and Engineering', 'CSE')
on conflict (code) do nothing;
```

### 5.2 Test Users for All Roles

Note:
- Replace `clerk_id` placeholders with real Clerk IDs later.
- Email is unique, so this query is safe to rerun.

```sql
insert into users (clerk_id, name, roll_no, email, role, department_id, year, branch, section)
select *
from (
  values
    ('temp_super_admin',      'Super Admin',        null,      'admin.test@ltsu.ac.in',          'super_admin',         null, null, null, null),
    ('temp_hod',              'HOD User',           null,      'hod.test@ltsu.ac.in',            'hod',                 null, null, null, null),
    ('temp_faculty',          'Faculty Coordinator',null,      'faculty.test@ltsu.ac.in',        'faculty_coordinator', null, null, null, null),
    ('temp_class_incharge',   'Class Incharge',     null,      'classincharge.test@ltsu.ac.in',  'class_incharge',      null, null, null, null),
    ('temp_organizer',        'Organizer User',     'ORG001',  'organizer.test@ltsu.ac.in',      'organizer',           null, '3', 'CSE', 'A'),
    ('temp_volunteer',        'Volunteer User',     'VOL001',  'volunteer.test@ltsu.ac.in',      'volunteer',           null, '2', 'CSE', 'A'),
    ('temp_cr',               'CR User',            'CR001',   'cr.test@ltsu.ac.in',             'cr',                  null, '2', 'CSE', 'A'),
    ('temp_student',          'Student User',       'STU001',  'student.test@ltsu.ac.in',        'student',             null, '2', 'CSE', 'A')
) as t(clerk_id, name, roll_no, email, role, department_id, year, branch, section)
left join lateral (
  select id as dept_id from departments where code = 'CSE' limit 1
) d on true
where not exists (select 1 from users u where u.email = t.email)
returning id, email, role;
```

Now assign `department_id` for all non-super_admin users:

```sql
update users
set department_id = (select id from departments where code = 'CSE' limit 1)
where role <> 'super_admin'
  and department_id is null;
```

### 5.3 One Club

```sql
insert into clubs (name, description, logo_url, department_id)
select 'CSE Coding Club', 'Default test club for CSE', null, d.id
from departments d
where d.code = 'CSE'
  and not exists (select 1 from clubs c where c.name = 'CSE Coding Club')
returning id, name;
```

### 5.4 One Venue

```sql
insert into venues (name, capacity, department_id, is_shared)
select 'Main Auditorium', 500, d.id, true
from departments d
where d.code = 'CSE'
  and not exists (select 1 from venues v where v.name = 'Main Auditorium')
returning id, name;
```

## 6. Insert Required App-Test Event Data

### 6.1 One Live Event

```sql
insert into events (
  title, description, date, venue_id, club_id, department_id,
  payment_type, fee, status, form_open, form_close, max_responses, created_by
)
select
  'Tech Symposium 2026',
  'Default live event for end-to-end testing',
  now() + interval '7 day',
  v.id,
  c.id,
  d.id,
  'paid',
  100,
  'live',
  now() - interval '1 day',
  now() + interval '5 day',
  300,
  (select id from users where role = 'organizer' and email = 'organizer.test@ltsu.ac.in' limit 1)
from departments d
join clubs c on c.department_id = d.id and c.name = 'CSE Coding Club'
join venues v on v.department_id = d.id and v.name = 'Main Auditorium'
where d.code = 'CSE'
  and not exists (select 1 from events e where e.title = 'Tech Symposium 2026')
returning id, title, status;
```

### 6.2 Venue Booking for Event

```sql
insert into venue_bookings (venue_id, event_id, department_id, start_time, end_time, status)
select
  v.id,
  e.id,
  d.id,
  e.date,
  e.date + interval '3 hours',
  'confirmed'
from events e
join departments d on d.id = e.department_id
join venues v on v.id = e.venue_id
where e.title = 'Tech Symposium 2026'
  and not exists (select 1 from venue_bookings vb where vb.event_id = e.id)
returning id, event_id;
```

### 6.3 Class Money Collection Row (for CR/Faculty dashboards)

```sql
insert into money_collection (
  event_id, department_id, year, branch, section, amount_collected, collected_by, approved_by
)
select
  e.id,
  e.department_id,
  '2',
  'CSE',
  'A',
  5000,
  (select id from users where email = 'cr.test@ltsu.ac.in' limit 1),
  (select id from users where email = 'faculty.test@ltsu.ac.in' limit 1)
from events e
where e.title = 'Tech Symposium 2026'
  and not exists (
    select 1 from money_collection m
    where m.event_id = e.id and m.year = '2' and m.branch = 'CSE' and m.section = 'A'
  )
returning id, amount_collected;
```

## 7. Optional Student Registration Test Row

```sql
insert into registrations (
  student_id, event_id, department_id, status, payment_method, payment_status
)
select
  (select id from users where email = 'student.test@ltsu.ac.in' limit 1),
  (select id from events where title = 'Tech Symposium 2026' limit 1),
  (select id from departments where code = 'CSE' limit 1),
  'confirmed',
  'upi',
  'pending'
where not exists (
  select 1 from registrations r
  where r.student_id = (select id from users where email = 'student.test@ltsu.ac.in' limit 1)
    and r.event_id = (select id from events where title = 'Tech Symposium 2026' limit 1)
)
returning id, status;
```

## 8. Replace Placeholder Clerk IDs (Required for Real Login)

After creating users in Clerk, update each `clerk_id`:

```sql
update users set clerk_id = 'user_xxx_student' where email = 'student.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_organizer' where email = 'organizer.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_volunteer' where email = 'volunteer.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_hod' where email = 'hod.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_faculty' where email = 'faculty.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_classincharge' where email = 'classincharge.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_cr' where email = 'cr.test@ltsu.ac.in';
update users set clerk_id = 'user_xxx_admin' where email = 'admin.test@ltsu.ac.in';
```

## 9. Verification Queries

Run these to confirm setup:

```sql
-- Roles check
select email, role, department_id, clerk_id
from users
where email like '%.test@ltsu.ac.in'
order by role;

-- Event check
select title, status, date, payment_type, fee
from events
where title = 'Tech Symposium 2026';

-- Money collection check
select year, branch, section, amount_collected
from money_collection
order by updated_at desc
limit 5;
```

## 10. Quick Reset (Optional)

```sql
delete from money_collection where event_id in (select id from events where title = 'Tech Symposium 2026');
delete from venue_bookings where event_id in (select id from events where title = 'Tech Symposium 2026');
delete from registrations where event_id in (select id from events where title = 'Tech Symposium 2026');
delete from events where title = 'Tech Symposium 2026';
delete from clubs where name = 'CSE Coding Club';
delete from venues where name = 'Main Auditorium';
delete from users where email like '%.test@ltsu.ac.in';
```

## 11. Import Existing LTSU_Complete Folder Data

You already have a large dataset folder:

- `D:\event manager\LTSU_Complete_20260205_090720`

This project now includes an importer script that:

- reads JSON/CSV/TXT/XLSX,
- auto-maps safe files to `departments` and `users`,
- writes missing values as `NULL` (`None` in Python),
- skips unsafe/unknown files unless explicitly mapped.

### 11.1 Required environment variables

Set these before running import:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

You can place them in:

- `college_event_system/flask_api/.env` (recommended), or
- your terminal environment.

### 11.2 Run dry-run first

From `college_event_system/scripts`:

```bat
import_ltsu_data.bat dry
```

### 11.3 Run actual import

```bat
import_ltsu_data.bat auto
```

### 11.4 Import a custom update file (excel/json/text/csv)

Examples:

```bat
import_ltsu_data.bat file users D:\data\students_update.xlsx email
import_ltsu_data.bat file departments D:\data\departments.json code
```

Arguments:

- `file <table> <file_path> [on_conflict]`
- `on_conflict` is optional upsert key (for example `email`)

### 11.5 Null handling rule

Importer normalizes the following to `NULL`:

- empty string `""`
- `null`, `none`, `nan`, `n/a`, `na`

For required user fields, safe fallbacks are used when source is missing:

- `clerk_id` -> `temp_<source_user_id>`
- `email` -> `<clerk_id>@import.local`
- `name` -> `Unknown`
- `role` -> `student`

## 12. Permission Hierarchy for Data Editing

Requirement implemented:

- Students can fill their own necessary/personal details.
- Sensitive data can only be edited by `class_incharge` or above.
- If class incharge grants delegation, `cr` can also edit sensitive data.

Apply SQL file:

- `college_event_system/supabase/sensitive_data_permissions.sql`

This SQL adds:

1. `role_delegations` table for CR delegation.
2. RLS + trigger protection for `users` sensitive fields (`role`, `department_id`).
3. Sensitive-write policies on:
  - `payments`
  - `money_collection`
  - `duty_leaves`

Delegation scope supports department filtering and optional expiration.

## 13. File References Added in Project

- Import script: `college_event_system/scripts/import_ltsu_data.py`
- Batch runner: `college_event_system/scripts/import_ltsu_data.bat`
- Permission SQL: `college_event_system/supabase/sensitive_data_permissions.sql`

## Notes

- If you already enabled RLS, inserts from SQL editor should still work as project owner.
- For app login, matching `users.clerk_id` is mandatory.
- Keep `super_admin` with nullable `department_id` as configured above.
- Always run `dry` mode before first real import.
