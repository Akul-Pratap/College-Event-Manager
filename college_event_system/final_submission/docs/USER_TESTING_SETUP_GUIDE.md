# User Testing Setup Guide (Clerk + Supabase)

This guide explains how to create test users for every role in the LTSU Event Management System.

## 1. Important Architecture Note

This project does **not** use a local password table in Supabase for login.

Authentication flow:
1. User logs in with email/password in Clerk.
2. Clerk issues JWT.
3. Flask verifies JWT.
4. Flask loads profile from `users` table in Supabase using `clerk_id`.

So for testing, every account needs:
- A Clerk user (email + password)
- A matching Supabase `users` row with the same `clerk_id`

---

## 2. Prerequisites

Before creating test users, ensure:
- Clerk project is configured and password sign-in is enabled.
- Supabase project has schema applied.
- At least one department exists in `departments` table.

Use this SQL to verify departments:

```sql
select id, name, code from departments order by name;
```

Copy one department UUID for test users.

---

## 3. Test Accounts Plan (All Roles)

Recommended test emails:
- student.test@ltsu.ac.in
- organizer.test@ltsu.ac.in
- volunteer.test@ltsu.ac.in
- hod.test@ltsu.ac.in
- faculty.test@ltsu.ac.in
- classincharge.test@ltsu.ac.in
- cr.test@ltsu.ac.in
- admin.test@ltsu.ac.in

Recommended temporary password (same for all):
- `LTSU@Test1234`

Change the password later if required by policy.

---

## 4. Step A: Create Users in Clerk

For each test account:
1. Open Clerk Dashboard.
2. Go to Users.
3. Click Create User.
4. Enter email and password.
5. Save user.
6. Copy Clerk User ID (format usually like `user_xxxxx`).

Repeat for all 8 roles.

---

## 5. Step B: Insert Matching Profiles in Supabase

Open Supabase SQL Editor and run this template.

Replace:
- `PUT_DEPT_UUID_HERE` with your real department UUID.
- `user_test_*` values with actual Clerk user IDs from Step A.

```sql
insert into users (
  clerk_id,
  email,
  first_name,
  last_name,
  role,
  department_id,
  year_of_study
)
values
  ('user_test_student',        'student.test@ltsu.ac.in',       'Test', 'Student',   'student',             'PUT_DEPT_UUID_HERE', 2),
  ('user_test_organizer',      'organizer.test@ltsu.ac.in',     'Test', 'Organizer', 'organizer',           'PUT_DEPT_UUID_HERE', 3),
  ('user_test_volunteer',      'volunteer.test@ltsu.ac.in',     'Test', 'Volunteer', 'volunteer',           'PUT_DEPT_UUID_HERE', 2),
  ('user_test_hod',            'hod.test@ltsu.ac.in',           'Test', 'HOD',       'hod',                 'PUT_DEPT_UUID_HERE', null),
  ('user_test_faculty',        'faculty.test@ltsu.ac.in',       'Test', 'Faculty',   'faculty_coordinator', 'PUT_DEPT_UUID_HERE', null),
  ('user_test_class_incharge', 'classincharge.test@ltsu.ac.in', 'Test', 'CI',        'class_incharge',      'PUT_DEPT_UUID_HERE', null),
  ('user_test_cr',             'cr.test@ltsu.ac.in',            'Test', 'CR',        'cr',                  'PUT_DEPT_UUID_HERE', 2),
  ('user_test_admin',          'admin.test@ltsu.ac.in',         'Test', 'Admin',     'super_admin',         'PUT_DEPT_UUID_HERE', null);
```

---

## 6. If You Inserted Placeholder `clerk_id` First

You can update each row after creating real Clerk users.

Example:

```sql
update users
set clerk_id = 'user_2abcXYZreal'
where email = 'student.test@ltsu.ac.in';
```

Run once for each test account.

---

## 7. Verification Checklist

For each role account:
1. Log in through app UI with test email/password.
2. Confirm login succeeds (no 401 from backend).
3. Confirm role-based route opens correctly:
   - student -> `/student`
   - organizer -> `/organizer`
   - volunteer -> `/volunteer`
   - hod -> `/hod`
   - faculty_coordinator -> `/faculty`
   - super_admin -> `/admin`
   - class_incharge -> `/class-incharge`
   - cr -> `/cr`
4. Verify role-specific actions are visible and protected.

---

## 8. Quick Debug Queries

Check if profile exists for an email:

```sql
select id, clerk_id, email, role, department_id
from users
where email = 'student.test@ltsu.ac.in';
```

Find duplicate emails or Clerk IDs:

```sql
select email, count(*)
from users
group by email
having count(*) > 1;
```

```sql
select clerk_id, count(*)
from users
group by clerk_id
having count(*) > 1;
```

---

## 9. Common Errors and Fixes

### Error: "User profile not found. Please complete registration."
Cause: Clerk user exists, but no matching Supabase row by `clerk_id`.
Fix: Insert or update row in `users` table with exact Clerk user ID.

### Error: 401 "Missing or invalid Authorization header"
Cause: JWT not sent or expired.
Fix: Re-login and ensure app stores token correctly.

### Wrong dashboard after login
Cause: Role value mismatch in `users.role`.
Fix: Use only supported roles:
- student
- organizer
- volunteer
- hod
- faculty_coordinator
- super_admin
- class_incharge
- cr

---

## 10. Cleanup (Optional)

To remove all test users from Supabase:

```sql
delete from users
where email in (
  'student.test@ltsu.ac.in',
  'organizer.test@ltsu.ac.in',
  'volunteer.test@ltsu.ac.in',
  'hod.test@ltsu.ac.in',
  'faculty.test@ltsu.ac.in',
  'classincharge.test@ltsu.ac.in',
  'cr.test@ltsu.ac.in',
  'admin.test@ltsu.ac.in'
);
```

Also delete the same users in Clerk dashboard if no longer needed.

---

## 11. Recommended Testing Order

1. super_admin
2. hod
3. faculty_coordinator
4. organizer
5. volunteer
6. class_incharge
7. cr
8. student

This order helps validate admin-level flows before student-facing paths.
