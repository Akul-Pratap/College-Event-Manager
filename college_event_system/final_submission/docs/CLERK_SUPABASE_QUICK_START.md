# Clerk + Supabase Quick Start (10 Minutes)

Use this when you just want login + profile sync working quickly.

## 1. Required Keys

Get from Clerk:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Get from Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## 2. Environment Setup

### Next.js

File: `college_event_system/nextjs_website/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_or_live_xxx
CLERK_SECRET_KEY=sk_test_or_live_xxx
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000
```

### Flask API

File: `college_event_system/flask_api/.env`

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

## 3. Create/Update Database

Run SQL file in Supabase SQL Editor:

- `college_event_system/supabase/supabase_full_setup.sql`

This creates tables and required columns such as:
- `users.clerk_id`
- `users.secondary_role`
- `events.upi_id`

## 4. Start Apps

From project root:

```bash
# Terminal 1
cd college_event_system/flask_api
python app.py
```

```bash
# Terminal 2
cd college_event_system/nextjs_website
npm run dev
```

## 5. Verify Clerk Sign-Up Flow

1. Open web app and sign up.
2. You should be redirected to `/onboarding`.
3. Complete onboarding.
4. You should land on `/dashboard/[dept]/student`.

Behind the scenes:
- Clerk session is created.
- Clerk metadata is updated (`role`, `department`).
- Flask `/api/auth/register` creates/syncs Supabase profile row.

## 6. Verify Supabase Mapping

Run in Supabase SQL Editor:

```sql
select email, clerk_id, role, secondary_role, department_id
from public.users
order by created_at desc
limit 20;
```

If `clerk_id` is present and matches Clerk user ID, integration is correct.

## 7. Add More Users Quickly (Optional)

Use bulk sync script:

```bat
cd college_event_system\scripts
bulk_clerk_sync.bat dry templates\clerk_users_template.csv
bulk_clerk_sync.bat run templates\clerk_users_template.csv LTSU@12345
```

## 8. Common Fixes

### User logs in but API says profile not found
- Complete onboarding once, or run bulk sync.

### Redirect loop
- Check metadata has both `role` and `department`.
- Check route guard in `nextjs_website/proxy.ts`.

### Unauthorized API calls
- Ensure frontend sends `Authorization: Bearer <Clerk JWT>`.

## 9. Next Docs

- Full Clerk guide:
  - `college_event_system/final_submission/docs/CLERK_SETUP_AND_INTEGRATION_GUIDE.md`
- Full Supabase guide:
  - `college_event_system/final_submission/docs/SUPABASE_SETUP_AND_IMPORT_GUIDE.md`
