-- Dummy test users cleanup
--
-- Usage:
-- 1) Open Supabase SQL Editor.
-- 2) Run this file to remove only dummy users.

begin;

delete from public.users
where clerk_id like 'temp_%'
   or email in (
    'student.test@ltsu.ac.in',
    'organizer.test@ltsu.ac.in',
    'volunteer.test@ltsu.ac.in',
    'hod.test@ltsu.ac.in',
    'faculty.test@ltsu.ac.in',
    'classincharge.test@ltsu.ac.in',
    'cr.test@ltsu.ac.in',
    'admin.test@ltsu.ac.in'
  );

commit;

-- Quick check
select id, clerk_id, email, role
from public.users
where clerk_id like 'temp_%'
   or email in (
    'student.test@ltsu.ac.in',
    'organizer.test@ltsu.ac.in',
    'volunteer.test@ltsu.ac.in',
    'hod.test@ltsu.ac.in',
    'faculty.test@ltsu.ac.in',
    'classincharge.test@ltsu.ac.in',
    'cr.test@ltsu.ac.in',
    'admin.test@ltsu.ac.in'
  )
order by email;
