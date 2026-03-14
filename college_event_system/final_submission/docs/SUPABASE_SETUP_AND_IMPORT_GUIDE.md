# Supabase Setup and Database Import Guide (LTSU)

Use this guide to set up Supabase for the current codebase, including dual-role support (`secondary_role`) and event-level UPI (`events.upi_id`).

## Files to Use

- Schema + patch + seed SQL:
  - `college_event_system/supabase/supabase_full_setup.sql`
- Clerk setup + Clerk-Supabase integration:
  - `college_event_system/final_submission/docs/CLERK_SETUP_AND_INTEGRATION_GUIDE.md`
- Existing data importer:
  - `college_event_system/scripts/import_ltsu_data.py`
  - `college_event_system/scripts/import_ltsu_data.bat`

## Method A: SQL Editor (Fastest)

1. Open Supabase Project Dashboard.
2. Go to SQL Editor -> New Query.
3. Paste full content of `college_event_system/supabase/supabase_full_setup.sql`.
4. Run once.

This will:
- create missing tables,
- patch older schema (adds `users.secondary_role`, `events.upi_id`, `events.start_time`, `events.end_time`),
- create constraints/indexes,
- add minimum seed data for testing.

## Method B: Supabase CLI Migration (Versioned)

Use the provided batch script at `college_event_system/scripts/supabase_migrate.bat`.

**Prerequisites:** Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase login` once.

### One-step: create migration + push

```bat
cd college_event_system\scripts
supabase_migrate.bat run
```

### Step-by-step

```bat
cd college_event_system\scripts

:: 1. Create versioned migration file from supabase_full_setup.sql
supabase_migrate.bat new

:: 2. Push to Supabase
supabase_migrate.bat push
```

### Other commands

```bat
supabase_migrate.bat status   :: Show migration history
supabase_migrate.bat reset    :: Reset local DB (destructive, asks confirmation)
```

The `new` command automatically copies `supabase/supabase_full_setup.sql` into a timestamped migration file under `supabase/migrations/`.

## Configure API Environment

In `college_event_system/flask_api/.env` set:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
```

Optional frontend env (`college_event_system/nextjs_website/.env.local`):

```env
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5000
```

## Import Existing LTSU Dataset

Recommended setup command first:

```bat
cd college_event_system\scripts
update_data_folder.bat setup
```

This folder updater workflow:
- reads files from `college_event_system/scripts/data_updates/<table_name>/`,
- supports `json`, `csv`, `xlsx/xls`, and `txt`,
- cleans rows to known database columns before upsert,
- skips invalid rows (missing conflict keys),
- de-duplicates conflicts in the same run (latest row wins).

Default table folders:
- `departments`
- `users`
- `clubs`
- `venues`
- `events`
- `registrations`
- `money_collection`

### 1. Dry run first

From `college_event_system/scripts`:

```bat
update_data_folder.bat dry
```

### 2. Real import

```bat
update_data_folder.bat run
```

### 3. Run one specific table folder only

```bat
update_data_folder.bat table-dry users
update_data_folder.bat table-run users
```

You can still use file-by-file mode with `import_ltsu_data.bat`, but folder mode is recommended for regular updates.

## Replace Placeholder Clerk IDs

After creating users in Clerk, map real Clerk user IDs:

```sql
update public.users set clerk_id = 'user_xxx_student' where email = 'student.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_organizer' where email = 'organizer.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_volunteer' where email = 'volunteer.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_hod' where email = 'hod.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_faculty' where email = 'faculty.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_classincharge' where email = 'classincharge.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_cr' where email = 'cr.test@ltsu.ac.in';
update public.users set clerk_id = 'user_xxx_admin' where email = 'admin.test@ltsu.ac.in';
```

## Verification Queries

```sql
-- check core users and dual roles
select email, role, secondary_role, department_id
from public.users
where email like '%.test@ltsu.ac.in'
order by role, email;

-- check event payment fields required by latest app flow
select title, status, payment_type, fee, upi_id, start_time, end_time
from public.events
where title = 'Tech Symposium 2026';

-- check class money collection row
select event_id, year, branch, section, amount_collected, updated_at
from public.money_collection
order by updated_at desc
limit 5;
```

## Notes

- `cr` is modeled as a student identity with elevated privileges via `secondary_role='cr'`.
- Privilege escalation page updates `users.role` and `users.secondary_role`; this schema supports that directly.
- If your project already has older tables, the setup SQL is safe to re-run.

## Clerk Setup Options (1 + 2 + 3)

### Option 1: Manual Clerk users + SQL mapping (small batches)

1. Create users in Clerk Dashboard manually.
2. Set a temporary shared password for testing if needed.
3. Add role + department metadata in Clerk public metadata.
4. Map each real Clerk ID into Supabase:

```sql
update public.users set clerk_id = 'user_real_id_1' where email = 'admin.test@ltsu.ac.in';
update public.users set clerk_id = 'user_real_id_2' where email = 'hod.test@ltsu.ac.in';
```

Use this when user count is low and you need full manual control.

### Option 2: Bulk Clerk create/sync script (recommended for many users)

New files:

- `college_event_system/scripts/bulk_clerk_sync.py`
- `college_event_system/scripts/bulk_clerk_sync.bat`
- `college_event_system/scripts/templates/clerk_users_template.csv`

Required env vars:

- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Run dry-run first:

```bat
cd college_event_system\scripts
bulk_clerk_sync.bat dry templates\clerk_users_template.csv
```

Run actual bulk sync:

```bat
cd college_event_system\scripts
bulk_clerk_sync.bat run templates\clerk_users_template.csv LTSU@12345
```

What it does:

- creates Clerk users if missing,
- updates Clerk public metadata (`role`, `department`),
- upserts Supabase `users` table by email,
- supports `secondary_role` (e.g., `student + cr`).

### Option 3: Self-signup flow (no pre-creation)

Flow:

1. User signs up via Clerk (`/sign-up`).
2. User is redirected to `/onboarding`.
3. Onboarding now:
  - updates Clerk metadata,
  - calls Flask `POST /api/auth/register`,
  - creates/syncs the Supabase `users` profile automatically.

Important prerequisites:

- department list must already exist in `departments` table,
- `NEXT_PUBLIC_FLASK_API_URL` must be set correctly,
- Flask API must be running and reachable.

This is best for open registration scenarios.

## Troubleshooting Legacy Schema Errors

If you see an error like:

`ERROR: column "payment_type" does not exist`

your `events` table is from an older schema version. Run this patch in Supabase SQL Editor:

```sql
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

update public.events
set date = coalesce(date, start_date, created_at, now())
where date is null;

update public.events
set payment_type = coalesce(payment_type, case when coalesce(fee, 0) > 0 then 'paid' else 'free' end)
where payment_type is null;

update public.events
set status = coalesce(status, 'draft')
where status is null;
```

After this, re-run the verification query.

If you see an error like:

`ERROR: column "department_id" does not exist`

your legacy schema is missing department scoping columns. Re-run the latest full setup SQL:

- `college_event_system/supabase/supabase_full_setup.sql`

The upgrade patch now auto-adds `department_id` to legacy tables before constraints/indexes/seed steps execute.

If you see an error like:

`ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`

your legacy schema does not have the expected unique constraints yet. Use the latest:

- `college_event_system/supabase/supabase_full_setup.sql`

The seed section is now written to avoid strict `ON CONFLICT(column_list)` dependency on older databases.
