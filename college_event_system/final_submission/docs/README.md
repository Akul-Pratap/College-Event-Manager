# LTSU Documentation Index

This repository contains documentation for the **LTSU Event Manager** — a College Event Management System built for Lamrin Tech Skills University. The system is a full-stack platform comprising a **Next.js** web portal, a **Flask** REST API backend, a **Flutter** mobile app, **Supabase** as the primary database and storage layer, and **Clerk** for authentication and user management across all roles.

---

## Start Here

Follow this order when setting up the project from scratch:

1. **[LTSU_Tech_Stack_Setup_Guide.md](LTSU_Tech_Stack_Setup_Guide.md)** — Create all 16 service accounts and collect every API key before touching any code.
2. **[DATABASE_SCHEMA_AND_SEED_SETUP.md](DATABASE_SCHEMA_AND_SEED_SETUP.md)** — Apply the Supabase SQL schema and load seed data.
3. **[CLERK_SUPABASE_QUICK_START.md](CLERK_SUPABASE_QUICK_START.md)** — Get authentication working in ~10 minutes using the fast path.
4. **[CLERK_SETUP_AND_INTEGRATION_GUIDE.md](CLERK_SETUP_AND_INTEGRATION_GUIDE.md)** — Complete deep-dive on Clerk configuration and Supabase JWT integration.
5. **[SUPABASE_SETUP_AND_IMPORT_GUIDE.md](SUPABASE_SETUP_AND_IMPORT_GUIDE.md)** — Import real LTSU student, course, and payment data into the database.
6. **[LTSU_Build_Instructions.md](LTSU_Build_Instructions.md)** — Build and run the full stack (Next.js + Flask + Flutter) locally.
7. **[LTSU_Flutter_Deployment.md](LTSU_Flutter_Deployment.md)** — Build the Flutter APK and distribute it for testing or production.
8. **[USER_TESTING_SETUP_GUIDE.md](USER_TESTING_SETUP_GUIDE.md)** — Create test accounts for every role (admin, organizer, student, etc.).

---

## Documentation Reference

| Doc | Purpose | Prerequisites |
|-----|---------|---------------|
| [LTSU_Tech_Stack_Setup_Guide.md](LTSU_Tech_Stack_Setup_Guide.md) | Master reference for all 16 services — accounts, API keys, and environment variable names | None — start here |
| [DATABASE_SCHEMA_AND_SEED_SETUP.md](DATABASE_SCHEMA_AND_SEED_SETUP.md) | SQL schema creation, table definitions, RLS policies, and seed data steps | Supabase project created |
| [CLERK_SUPABASE_QUICK_START.md](CLERK_SUPABASE_QUICK_START.md) | 10-minute fast path to get Clerk authentication working with Supabase | Supabase + Clerk accounts |
| [CLERK_SETUP_AND_INTEGRATION_GUIDE.md](CLERK_SETUP_AND_INTEGRATION_GUIDE.md) | Complete Clerk setup: JWT templates, webhooks, RLS integration, and role claims | CLERK_SUPABASE_QUICK_START completed |
| [SUPABASE_SETUP_AND_IMPORT_GUIDE.md](SUPABASE_SETUP_AND_IMPORT_GUIDE.md) | Supabase project configuration and bulk import of LTSU student/course/payment data | Schema applied |
| [LTSU_Build_Instructions.md](LTSU_Build_Instructions.md) | Developer build guide for running Next.js, Flask API, and Flutter locally (merged v6+v7) | All API keys gathered |
| [LTSU_Flutter_Deployment.md](LTSU_Flutter_Deployment.md) | Flutter APK build, signing, and deployment guide (merged v6+v7) | LTSU_Build_Instructions completed |
| [USER_TESTING_SETUP_GUIDE.md](USER_TESTING_SETUP_GUIDE.md) | Step-by-step instructions to create test accounts for every user role in the system | Full stack running |
| [LTSU_Master_Plan.md](LTSU_Master_Plan.md) | Full project master plan: architecture, milestones, and roadmap (merged v6+v7) | Reference only |
| [launch_priority.md](launch_priority.md) | Week-by-week launch priority checklist for the production rollout | Reference only |
| [WEBSITE_ROLE_DATASET_HIERARCHY_AND_PRIVILEGES.md](WEBSITE_ROLE_DATASET_HIERARCHY_AND_PRIVILEGES.md) | Role hierarchy definitions and dataset access rules for every user type | Reference only |

---

## Subfolders

### `archive/`

Contains superseded source versions of documents that have since been merged:

- `LTSU_Master_Plan_v6.md`, `LTSU_Master_Plan_v7.md` — source versions merged into `LTSU_Master_Plan.md`
- `LTSU_Build_Instructions_v6.md`, `LTSU_Build_Instructions_v7.md` — source versions merged into `LTSU_Build_Instructions.md`
- `LTSU_Flutter_Deployment_v6.md`, `LTSU_Flutter_Deployment_v7.md` — source versions merged into `LTSU_Flutter_Deployment.md`
- `WEBSITE_ROLE_DATASET_HIERARCHY_AND_PRIVILEGES.txt` — plain text copy of the role hierarchy document

These files are kept for reference and diff history. Use the merged root-level versions for all active work.

### `working/`

Contains in-progress notes that are not yet finalized:

- `plan.md` — Development plans and design decisions under discussion
- `todo.md` — Active task list
- `instruction.md` — Copilot/agent instruction drafts

These files reflect current working state and may change frequently.
