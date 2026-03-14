-- Dummy test users seed (safe to rerun)
--
-- Usage:
-- 1) Open Supabase SQL Editor.
-- 2) Run this file.
--
-- Note:
-- Passwords are managed by Clerk, not stored in public.users.

begin;

with selected_department as (
  select id
  from public.departments
  where code in ('CS', 'CSE', 'EC', 'ME', 'CE', 'MBA')
  order by case code
    when 'CS' then 1
    when 'CSE' then 2
    when 'EC' then 3
    when 'ME' then 4
    when 'CE' then 5
    when 'MBA' then 6
    else 99
  end
  limit 1
), seed_rows as (
  select *
  from (
    values
      ('temp_student',        'student.test@ltsu.ac.in',       'Test Student',   'student',             '2',   'CSE', 'A'),
      ('temp_organizer',      'organizer.test@ltsu.ac.in',     'Test Organizer', 'organizer',           '3',   'CSE', 'A'),
      ('temp_volunteer',      'volunteer.test@ltsu.ac.in',     'Test Volunteer', 'volunteer',           '2',   'CSE', 'A'),
      ('temp_hod',            'hod.test@ltsu.ac.in',           'Test HOD',       'hod',                 null,  null,  null),
      ('temp_faculty',        'faculty.test@ltsu.ac.in',       'Test Faculty',   'faculty_coordinator', null,  null,  null),
      ('temp_class_incharge', 'classincharge.test@ltsu.ac.in', 'Test CI',        'class_incharge',      null,  null,  null),
      ('temp_cr',             'cr.test@ltsu.ac.in',            'Test CR',        'cr',                  '2',   'CSE', 'A'),
      ('temp_admin',          'admin.test@ltsu.ac.in',         'Test Admin',     'super_admin',         null,  null,  null)
  ) as t(clerk_id, email, name, role, year, branch, section)
)
insert into public.users (
  clerk_id,
  name,
  email,
  role,
  department_id,
  year,
  branch,
  section
)
select
  s.clerk_id,
  s.name,
  s.email,
  s.role,
  (select id from selected_department),
  s.year,
  s.branch,
  s.section
from seed_rows s
on conflict (email)
do update set
  clerk_id = excluded.clerk_id,
  name = excluded.name,
  role = excluded.role,
  department_id = excluded.department_id,
  year = excluded.year,
  branch = excluded.branch,
  section = excluded.section;

commit;

-- Quick check
select id, clerk_id, email, role, year, branch, section
from public.users
where clerk_id like 'temp_%'
order by email;
