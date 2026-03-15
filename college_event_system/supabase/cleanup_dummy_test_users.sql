-- Dummy dashboard cleanup
--
-- Usage:
-- 1) Open Supabase SQL Editor.
-- 2) Run this file to remove all seeded dummy users and related dashboard data.

begin;

delete from public.form_responses
where registration_id in (
  select r.id from public.registrations r
  join public.events e on e.id = r.event_id
  where e.title like '[Dummy] %'
)
or registration_id in (
  select r.id from public.registrations r
  where r.event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
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
or registration_id in (
  select id from public.registrations where event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
)
or marked_by in (select id from public.users where clerk_id like 'temp_%');

delete from public.payments
where registration_id in (
  select id from public.registrations where event_id in (
   select id from public.events where title like '[Dummy] %'
  )
)
or registration_id in (
  select id from public.registrations where event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
);

delete from public.waitlist
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or student_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.money_collection
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or collected_by in (select id from public.users where clerk_id like 'temp_%')
  or approved_by in (select id from public.users where clerk_id like 'temp_%');

delete from public.duty_leaves
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or user_id in (select id from public.users where clerk_id like 'temp_%')
  or approved_by in (select id from public.users where clerk_id like 'temp_%');

delete from public.approval_requests
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or approver_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.gallery
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or uploaded_by in (select id from public.users where clerk_id like 'temp_%')
  or caption like '[Dummy] %';

delete from public.event_highlights
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or winner_name like 'Dummy %'
  or description like '[Dummy] %';

delete from public.venue_bookings
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or venue_id in (select id from public.venues where name like '[Dummy] %');

delete from public.form_fields
where event_id in (select id from public.events where title like '[Dummy] %');

delete from public.form_fields
where event_id in (
  select e.id from public.events e
  where e.created_by in (select id from public.users where clerk_id like 'temp_%')
);

delete from public.registrations
where event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  )
  or student_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.club_join_requests
where club_id in (select id from public.clubs where name like '[Dummy] %')
  or user_id in (select id from public.users where clerk_id like 'temp_%')
   or event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  );

delete from public.club_members
where club_id in (select id from public.clubs where name like '[Dummy] %')
  or user_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.notifications
where user_id in (select id from public.users where clerk_id like 'temp_%')
  or message like '[Dummy] %';

delete from public.email_logs
where user_id in (select id from public.users where clerk_id like 'temp_%')
   or event_id in (select id from public.events where title like '[Dummy] %')
   or event_id in (
    select e.id from public.events e
    where e.created_by in (select id from public.users where clerk_id like 'temp_%')
  );

delete from public.login_attempts
where clerk_user_id like 'temp_%';

delete from public.role_delegations
where granter_user_id in (select id from public.users where clerk_id like 'temp_%')
  or grantee_user_id in (select id from public.users where clerk_id like 'temp_%');

delete from public.events
where title like '[Dummy] %'
  or created_by in (select id from public.users where clerk_id like 'temp_%');
delete from public.clubs where name like '[Dummy] %';
delete from public.venues where name like '[Dummy] %';

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

-- Quick checks
select id, clerk_id, email, role
from public.users
where clerk_id like 'temp_%'
order by email;

select id, title, status
from public.events
where title like '[Dummy] %'
order by title;
