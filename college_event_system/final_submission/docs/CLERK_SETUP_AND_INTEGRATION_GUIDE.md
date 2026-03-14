# Clerk Setup and Integration Guide (LTSU)

This guide covers complete Clerk setup for the LTSU Events project and how Clerk is integrated with Supabase profile data.

For a fast onboarding path, use:

- `college_event_system/final_submission/docs/CLERK_SUPABASE_QUICK_START.md`

## 1. Create Clerk Application

1. Open Clerk Dashboard.
2. Create a new application named **LTSU Events**.
3. Enable Email/Password sign-in.
4. Copy these keys:
   - Publishable Key
   - Secret Key

## 2. Local Environment Variables

These values are for local development only. See [Section 8](#8-production-deployment) for production (Vercel) environment configuration.

**Next.js** — `college_event_system/nextjs_website/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_or_test_xxx
CLERK_SECRET_KEY=sk_live_or_test_xxx
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000
```

**Flask** — `college_event_system/flask_api/.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

Notes:
- Clerk tokens are verified in Flask.
- Supabase auth in this project is profile-based through the `users.clerk_id` mapping.

## 3. Route Protection and Middleware

Configured route behavior:

- Sign-up redirects to onboarding.
- Onboarding completes profile metadata and syncs the profile row.
- Dashboard routes are role and department scoped.

Important files:
- `college_event_system/nextjs_website/proxy.ts`
- `college_event_system/nextjs_website/app/sign-up/page.tsx`
- `college_event_system/nextjs_website/app/onboarding/page.tsx`
- `college_event_system/nextjs_website/app/onboarding/actions.ts`

## 4. Clerk Metadata Contract

This project relies on these public metadata fields:

- `role`: one of
  - `super_admin`
  - `hod`
  - `faculty_coordinator`
  - `class_incharge`
  - `organizer`
  - `volunteer`
  - `cr`
  - `student`
- `department`: slug value used in the dashboard route
- `secondary_role` (optional): second role for dual-role behavior

Examples:

```json
{
  "role": "student",
  "department": "computer-science",
  "secondary_role": "cr"
}
```

```json
{
  "role": "faculty_coordinator",
  "department": "computer-science"
}
```

## 5. User Provisioning

Three provisioning modes are supported. Use whichever fits the deployment scenario.

### 5.1 Manual Mode

- Create users in Clerk.
- Set metadata for role and department.
- Map Clerk user IDs to the Supabase `users` table by email.

### 5.2 Bulk Mode

Files:
- `college_event_system/scripts/bulk_clerk_sync.py`
- `college_event_system/scripts/bulk_clerk_sync.bat`
- `college_event_system/scripts/templates/clerk_users_template.csv`

Required env vars:
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Commands:

```bat
cd college_event_system\scripts
bulk_clerk_sync.bat dry templates\clerk_users_template.csv
bulk_clerk_sync.bat run templates\clerk_users_template.csv LTSU@12345
```

### 5.3 Self-Signup Mode

Flow:

1. User signs up in Clerk.
2. User is redirected to `/onboarding`.
3. Onboarding action:
   - resolves the selected department from the database,
   - updates Clerk metadata,
   - calls Flask `/api/auth/register`,
   - creates or syncs the profile row in the Supabase `users` table.

## 6. Clerk to Supabase Mapping

Supabase `users` table fields and their Clerk sources:

| Supabase field    | Clerk source                        |
|-------------------|-------------------------------------|
| `clerk_id`        | `user.id`                           |
| `name`            | Clerk profile name                  |
| `email`           | Clerk primary email                 |
| `role`            | Clerk metadata `role`               |
| `secondary_role`  | Clerk metadata `secondary_role`     |
| `department_id`   | Resolved from selected department   |

Rule: App login and session work only when `users.clerk_id` matches the authenticated Clerk user ID.

## 7. Verification Checklist

### Local Development

Run these checks after initial setup:

1. Sign in through Clerk.
2. Confirm `/dashboard/[dept]/[role]` redirection works.
3. Confirm `/api/auth/me` returns the current user profile.
4. Confirm role-restricted pages are protected.
5. Confirm the dual-role switcher appears for users with `secondary_role`.

SQL check to inspect recent user rows:

```sql
select email, clerk_id, role, secondary_role, department_id
from public.users
order by created_at desc
limit 25;
```

### Production (Vercel)

Run these checks after deploying:

6. Verify Vercel deployment has all required env vars (build passes env validation).
7. Verify onboarding can fetch departments from `NEXT_PUBLIC_FLASK_API_URL`.
8. Verify `/api/auth/register` succeeds and stores `users.clerk_id`.
9. Verify dashboard redirect resolves to `/dashboard/[department]/[role]`.

## 8. Production Deployment

### 8.1 Vercel Environment Variables

Set these in **Vercel Project Settings → Environment Variables** for Production (and Preview if needed):

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_FLASK_API_URL`
- `NEXT_PUBLIC_APP_URL`

Important:
- `NEXT_PUBLIC_FLASK_API_URL` must be your deployed Flask API URL (not `localhost`).
- `NEXT_PUBLIC_APP_URL` must be your deployed Vercel domain.
- Never place service role keys in client-side code. In this app, `SUPABASE_SERVICE_KEY` is server-only.

Build validation in this repo enforces required production env vars via:

- `college_event_system/nextjs_website/scripts/validate-env.js`

If a Vercel build fails with missing env var errors, add them in Project Settings and redeploy.

### 8.2 Clerk Dashboard Production Settings

In Clerk Dashboard for the same application:

1. Add your Vercel domain under allowed origins/redirect URLs.
2. Set sign-in and sign-up routes to match app routes:
   - sign-in path: `/sign-in`
   - sign-up path: `/sign-up`
3. Ensure post-auth redirects land on `/dashboard` (middleware will route to the correct role/department page).

### 8.3 Supabase and Backend Integration

For an end-to-end production login and onboarding flow:

1. Apply the Supabase schema (`supabase_full_setup.sql`).
2. Ensure the `departments` table contains the values used in onboarding.
3. Confirm the Flask API exposes:
   - `GET /api/departments`
   - `POST /api/auth/register`
4. The Next.js onboarding action sends the Clerk JWT to Flask:
   - `college_event_system/nextjs_website/app/onboarding/actions.ts`
5. Flask verifies the Clerk JWT and upserts the user profile into the Supabase `users` table.

## 9. Troubleshooting

### 9.1 Redirect Loop After Login

Check:
- `proxy.ts` public route matcher
- User metadata includes both `role` and `department`

### 9.2 User Authenticated but API Returns Profile Not Found

Cause: missing row in `public.users` for this Clerk ID.

Fix:
- Run onboarding once, or
- Upsert the user row manually and set the correct `clerk_id`

### 9.3 Unauthorized Errors from Flask Endpoints

Check:
- Frontend sends `Authorization: Bearer <Clerk JWT>`
- Flask can reach the Clerk JWKS endpoint

### 9.4 Role Not Applied Correctly

Check:
- Metadata `role` value matches an allowed role in the enum
- `secondary_role` is not equal to the primary role

## 10. Related Docs

- Supabase and import guide:
  - `college_event_system/final_submission/docs/SUPABASE_SETUP_AND_IMPORT_GUIDE.md`
- Schema setup SQL:
  - `college_event_system/supabase/supabase_full_setup.sql`
