# LTSU Events - Execution To-Do (Repo-Backed)

## Execution Update - 14 Mar 2026

Completed in this implementation run:
- [x] Evaluated `LTSU_Build_Instructions_v6.md` and `LTSU_Master_Plan_v6.md` against current repo implementation.
- [x] Evaluated existing Next.js, Flask, and Flutter files using multiple subagents.
- [x] Replaced static/hardcoded data on key user dashboards with real API-backed fetches.
- [x] Added missing mobile user pages for Class Incharge and CR.
- [x] Fixed web registration/payment data-flow endpoint mismatches.
- [x] Added backend endpoint for payment info used by student payment page.
- [x] Cleaned generated artifacts/folders using `scripts/clean_artifacts.ps1`.
- [x] Fixed compile/runtime blockers across Flutter + Next.js after parallel code repair pass.
- [x] Flutter verification passed: `flutter analyze` and `flutter test`.
- [x] Next.js verification passed: `npm install` and `npm run build`.
- [x] Re-ran submission checks (`check_secrets.ps1`, `check_submission.ps1`) and reconfirmed current artifact gaps.
- [x] Re-ran Next.js local verification: production build passes with all role routes compiled.
- [x] Replaced Flutter student dashboard hardcoded placeholder cards/lists with API-backed event and registration views.
- [x] Removed hardcoded public mock event fallback in Next.js event details page (now shows explicit unavailable state instead of dummy data).
- [x] Flutter validation re-run after student dashboard refactor: `flutter analyze` passes.
- [x] Replaced Flutter organizer/faculty/volunteer placeholder dashboards with API-backed verification dashboards.
- [x] Removed hardcoded Supabase credentials from `flask_api/db_setup.py` and switched to env-driven setup.
- [x] Added fail-fast Supabase environment validation in `flask_api/models.py` for clearer startup diagnostics.
- [x] Replaced remaining explicit scanner placeholder copy with production-safe operational guidance.
- [x] Installed Python 3.11 locally, created `flask_api/.venv311`, and installed `flask_api/requirements.txt` successfully.
- [x] Verified Flask health endpoint locally in `.venv311` (`/api/health` returns HTTP 200).
- [ ] Public Flask data endpoint check is blocked by invalid local Supabase credentials (`/api/departments` returns 500: Invalid API key).

In progress now:
- [ ] End-to-end smoke test of all 8 web role dashboards with real Clerk users and real Supabase rows.
- [ ] End-to-end smoke test of Flutter role routing + role API calls on emulator/device.
- [ ] Remaining dummy/static content removal from non-updated Flutter screens (student/organizer/faculty modules still contain placeholders).
- [ ] Remaining Flutter placeholder cleanup is narrowed to scanner/camera UX placeholders and any non-critical static labels.
- [ ] Remaining Flutter placeholder cleanup is now limited to optional camera implementation enhancement (manual verification path already uses real API data).
- [ ] Flask local runtime verification now blocked by invalid local Supabase key configuration (Python compatibility issue resolved with 3.11).

This checklist is derived from:
- `LTSU_Build_Instructions_v6.md` (build/deploy steps and final submission checklist)
- `LTSU_Master_Plan_v6.md` (architecture + feature scope)
- Current repo contents under `college_event_system/`

Important constraints:
- Do not include any secret keys in screenshots, `code.zip`, or `final_submission.zip`.
- Do not use dummy/sample data for demos or screenshots. Use real departments/users/events created via Clerk + Supabase.

## 0. Repo Hygiene (Do This First)

- [ ] Keep secrets out of submission artifacts:
  - Next.js: `nextjs_website/.env.local` contains real keys (do not submit).
  - Flask: `flask_api/.env` contains real keys (do not submit).
  - Workspace root: `.env_backup.txt` looks like it contains real keys (do not submit).
- [x] Generate `final_submission/code.zip` from source only (no build artifacts):
  - Use the script: `college_event_system/scripts/prepare_submission.ps1`
- [x] Confirm `code.zip` does not contain:
  - `node_modules/`, `.next/`, `.vercel/`
  - `flask_api/venv/`, `__pycache__/`
  - `flutter_app/.dart_tool/`, `flutter_app/build/`, `.idea/`
  - any `.env*` files
- [x] Clean local build artifacts from workspace (optional, but keeps folders tidy):
  - Used: `college_event_system/scripts/clean_artifacts.ps1`
- [x] Add local check scripts:
  - `college_event_system/scripts/check_submission.ps1`
  - `college_event_system/scripts/check_secrets.ps1`

Status note (already initiated in code):
- Flask JWT verification was corrected to use JWKS keys, and missing dashboard endpoints were added to match Next.js dashboards.

## 1. Accounts + API Keys (Phase 1)

Create or confirm accounts and record keys (store privately, not in repo):
- [ ] GitHub: PAT token (repo/workflow scopes)
- [ ] Vercel
- [ ] Supabase: URL, anon key, service role key
- [ ] Clerk: publishable + secret key, Supabase JWT template
- [ ] Cloudinary: cloud name, key, secret, upload preset
- [ ] Resend: API key
- [ ] Upstash Redis: REST URL + token
- [ ] Railway
- [ ] Gemini API key
- [ ] Groq API key
- [ ] Firebase: Server key (FCM)
- [ ] OpenWeatherMap API key

## 2. Database (Phase 2)

- [ ] Create Supabase project and run `college_event_system/supabase_setup.sql`
  - Expected: 22 tables, 22 RLS enables, 22 policies (verified by quick scan).
- [ ] Verify RLS department isolation:
  - [ ] Student A cannot read Student B department events/registrations.
  - [ ] Organizer cannot modify other department records.
- [ ] Seed real departments in `departments` table (no dummy):
  - [ ] Use actual department names/codes used by the university.

## 3. Flask API (Phase 3 + Security)

Local run:
- [ ] `cd flask_api`
- [x] Create venv (recommended Python 3.11 to match `runtime.txt`)
- [x] `pip install -r requirements.txt`
- [ ] `cp .env.example .env` and fill real values
- [ ] `python app.py`

Current blocker note:
- Python 3.11 environment setup is complete (`flask_api/.venv311` + successful `pip install -r requirements.txt`).
- `/api/health` works locally, but Supabase-backed routes fail until local `.env` contains a valid `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` pair.

Critical checks:
- [ ] Confirm Clerk JWT validation works end-to-end (run locally with real Clerk users):
  - [ ] Next.js sends `Authorization: Bearer <token>`
  - [ ] Flask accepts token and loads `g.current_user` from Supabase `users`
- [x] Confirm required endpoints for dashboards exist:
  - [x] `/api/admin/stats`
  - [x] `/api/stats/department`
  - [x] `/api/volunteer/stats`
  - [x] `/api/club-members`
  - [x] `/api/money-collection`
  - [x] `/api/duty-leaves/pending` (alias)
  - [x] `/api/events?status=live&limit=...` filtering

Deployment:
- [ ] Deploy to Railway from `flask_api/`
- [ ] Set Railway variables (do not copy `.env` into repo)
- [ ] Confirm Railway URL is saved into Next.js env as `NEXT_PUBLIC_FLASK_API_URL`

## 4. Next.js Website (Phase 4 + Dashboards)

Local run:
- [ ] `cd nextjs_website`
- [x] `npm install`
- [ ] `cp .env.local.example .env.local` and fill real values
- [ ] `npm run dev`

Functional checks:
- [ ] Landing page shows (run locally):
  - [ ] live events from `/api/events/public`
  - [ ] highlights from `/api/highlights`
  - [x] departments from `/api/departments` (no hard-coded department list)
- [ ] Each role dashboard loads without console errors:
  - [ ] super admin
  - [ ] HOD
  - [ ] faculty coordinator
  - [ ] organizer
  - [ ] volunteer
  - [ ] student
  - [ ] class incharge
  - [ ] CR

Deployment:
- [ ] Deploy to Vercel from `nextjs_website/`
- [ ] Configure Vercel environment variables (no secrets in code)

## 5. Flutter App (Phase 7)

Environment:
- [ ] Install Flutter SDK and add to PATH
- [ ] Confirm Android toolchain works (Android Studio / SDK / emulator or device)

API alignment (important):
- [ ] Flutter currently points to `http://10.0.2.2:5000/api`
- [x] Flutter login flow does not use password login:
  - Token-based login screen added (paste a real Clerk JWT token, then use `/auth/me` to validate).
- [ ] Decide and implement one approach (no dummy data):
  - [ ] Option A: Integrate Clerk in Flutter (recommended for consistency).
  - [ ] Option B: Implement a separate auth mechanism for Flutter (requires schema + secure password handling).

Deliverable:
- [ ] Build release APK: `flutter build apk --release`
- [ ] Place `app-release.apk` in `final_submission/`

## 6. Security Testing (Phase 9)

Run only against localhost / test env:
- [ ] Burp Suite (3 screenshots)
- [ ] Nmap (3 screenshots)
- [ ] SQLMap (3 screenshots)
- [ ] Nikto (3 screenshots)
- [ ] Hydra (3 screenshots)
- [ ] Wireshark (3 screenshots)
- [ ] CyberChef (3 screenshots)

Store screenshots under:
- `final_submission/screenshots/security_tools/<tool>/...`

## 7. Final Submission Artifacts (Phase 10)

- [ ] `report.docx` complete (17 sections, screenshots inserted)
- [ ] `presentation.pptx` complete (18 slides)
- [x] `code.zip` generated via `scripts/prepare_submission.ps1`
- [ ] `app-release.apk` (release build)
- [ ] Application screenshots under `final_submission/screenshots/application/`
- [ ] Final zip assembled as `final_submission.zip` with the required structure
  - Use: `college_event_system/scripts/create_final_submission_zip.ps1` (fails fast if any artifact is missing)
