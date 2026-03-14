# LTSU College Event Management System

**Lamrin Tech Skills University — Secure Web & Mobile Platform v5.0**

A production-ready full-stack college event management system with 8 role-based dashboards,
AI-powered fraud detection, real-time venue conflict detection, and OWASP Top 10 security.
Total monthly cost: Rs. 0 (all free-tier services).

---

## Project Structure

```
college_event_system/
├── nextjs_website/      # Next.js 14 — deployed on Vercel
├── flask_api/           # Python Flask REST API — deployed on Railway
├── flutter_app/         # Flutter Android App (APK)
└── final_submission/    # Screenshots, docs, and submission artifacts
```

---

## Tech Stack

| Layer            | Technology                          | Hosting            |
|------------------|-------------------------------------|--------------------|
| Website          | Next.js 14 + Tailwind CSS + shadcn/ui | Vercel (free)    |
| REST API         | Python Flask + Gemini + Groq + Ollama | Railway (free)   |
| Mobile App       | Flutter (Dart)                      | Android APK        |
| Database         | Supabase PostgreSQL + RLS           | Supabase (free)    |
| Authentication   | Clerk (8 roles + dept isolation)    | Clerk (free)       |
| Image Storage    | Cloudinary                          | Cloudinary (free)  |
| Email            | Resend                              | Resend (free)      |
| Rate Limiting    | Upstash Redis                       | Upstash (free)     |
| Push Notifs      | Firebase FCM                        | Firebase (free)    |
| Security Testing | Burp Suite, Nmap, SQLMap, Nikto, Hydra, Wireshark, CyberChef | Kali Linux |

**Total Monthly Cost: Rs. 0**

---

## Quick Start

### 1. Next.js Website
```bash
cd nextjs_website
npm install
cp .env.local.example .env.local
# Fill in your API keys in .env.local
npm run dev
# Open http://localhost:3000
```

### 2. Flask API
```bash
cd flask_api
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
python app.py
# Running on http://localhost:5000
```

### 3. Flutter App
```bash
cd flutter_app
flutter pub get
# Copy google-services.json to android/app/
flutter run
# Build release APK:
flutter build apk --release
```

---

## 8 User Roles & Dashboards

| Role                  | Dashboard Route                          | Key Permissions                                          |
|-----------------------|------------------------------------------|----------------------------------------------------------|
| Super Admin           | /dashboard/[dept]/super-admin            | University-wide analytics, all users, venue management   |
| HOD                   | /dashboard/[dept]/hod                    | Approve/reject events, gallery, department analytics     |
| Faculty Coordinator   | /dashboard/[dept]/faculty-coordinator    | Club management, DL approvals, money collection view     |
| Class Incharge        | /dashboard/[dept]/class-incharge         | Edit money collection for their class only               |
| Student Organizer     | /dashboard/[dept]/organizer              | Create events, form builder, WhatsApp drafter, panic btn |
| Volunteer             | /dashboard/[dept]/volunteer              | QR scanner, manual attendance, offline mode              |
| Class Representative  | /dashboard/[dept]/cr                     | Edit money collection for their class only               |
| Student               | /dashboard/[dept]/student                | AI event feed, register, waitlist, clubs                 |

---

## Database — 22 Tables

| # | Table              | Purpose                          |
|---|--------------------|----------------------------------|
| 1 | departments        | All university departments       |
| 2 | users              | All user accounts                |
| 3 | clubs              | Club profiles                    |
| 4 | club_members       | Club organizer roster            |
| 5 | club_join_requests | Student join applications        |
| 6 | events             | All events                       |
| 7 | venues             | University venues                |
| 8 | venue_bookings     | Booking + conflict tracking      |
| 9 | event_highlights   | Past event winners               |
| 10 | form_fields       | Custom form fields               |
| 11 | form_responses    | Student form answers             |
| 12 | registrations     | Event registrations              |
| 13 | waitlist          | Auto-waitlist queue              |
| 14 | payments          | Payment records                  |
| 15 | money_collection  | Class-wise money collection      |
| 16 | attendance        | Gate entry records               |
| 17 | duty_leaves       | Duty leave records               |
| 18 | approval_requests | Multi-stage approvals            |
| 19 | gallery           | Formal gallery                   |
| 20 | notifications     | In-app notifications             |
| 21 | email_logs        | Email audit trail                |
| 22 | login_attempts    | Security audit log               |

---

## Deployment

### Flask API → Railway
```bash
git push origin main
# Railway auto-deploys from flask_api/ directory
# Set all .env variables in Railway → Variables tab
```

### Next.js → Vercel
```bash
git push origin main
# Vercel auto-deploys from nextjs_website/ directory
# Set all .env.local variables in Vercel → Environment Variables
```

### Flutter → APK
```bash
flutter build apk --release
# Output: flutter_app/build/app/outputs/flutter-apk/app-release.apk
```

---

## Security Testing (Kali Linux — local only)

> WARNING: Run all tests against localhost only. Never test against production.

```bash
# Port scan
nmap -sV -p- 192.168.x.x

# Web vulnerability scan
nikto -h http://192.168.x.x:5000

# SQL injection test
sqlmap -u "http://192.168.x.x:5000/api/login" \
  --data="email=test@test.com&password=test" \
  --level=3 --risk=2 --batch

# Brute force rate limit test
hydra -l admin@ltsu.edu -P test_wordlist.txt \
  192.168.x.x http-post-form \
  '/api/login:email=^USER^&password=^PASS^:Invalid credentials'
```

---

## Environment Variables

| Variable                          | Service      | File                        |
|-----------------------------------|--------------|-----------------------------|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk        | nextjs_website/.env.local   |
| CLERK_SECRET_KEY                  | Clerk        | nextjs_website/.env.local   |
| NEXT_PUBLIC_SUPABASE_URL          | Supabase     | nextjs_website/.env.local   |
| NEXT_PUBLIC_SUPABASE_ANON_KEY     | Supabase     | nextjs_website/.env.local   |
| SUPABASE_SERVICE_KEY              | Supabase     | nextjs_website/.env.local   |
| CLOUDINARY_CLOUD_NAME             | Cloudinary   | nextjs_website/.env.local   |
| CLOUDINARY_API_KEY                | Cloudinary   | nextjs_website/.env.local   |
| CLOUDINARY_API_SECRET             | Cloudinary   | nextjs_website/.env.local   |
| RESEND_API_KEY                    | Resend       | nextjs_website/.env.local   |
| UPSTASH_REDIS_REST_URL            | Upstash      | nextjs_website/.env.local   |
| UPSTASH_REDIS_REST_TOKEN          | Upstash      | nextjs_website/.env.local   |
| NEXT_PUBLIC_FLASK_API_URL         | Railway      | nextjs_website/.env.local   |
| OPENWEATHER_API_KEY               | OpenWeather  | nextjs_website/.env.local   |
| SUPABASE_URL                      | Supabase     | flask_api/.env              |
| SUPABASE_SERVICE_KEY              | Supabase     | flask_api/.env              |
| GEMINI_API_KEY                    | Google AI    | flask_api/.env              |
| GROQ_API_KEY                      | Groq         | flask_api/.env              |
| QR_SECRET_KEY                     | Custom       | flask_api/.env              |
| FIREBASE_SERVER_KEY               | Firebase     | flask_api/.env              |

See `nextjs_website/.env.local.example` and `flask_api/.env.example` for full templates.

---

## Final Submission Structure

```
final_submission/
├── docs/
├── screenshots/
│   ├── security_tools/
│   │   ├── burpsuite/    (burpsuite_setup.png, _input.png, _output.png)
│   │   ├── nmap/
│   │   ├── sqlmap/
│   │   ├── nikto/
│   │   ├── hydra/
│   │   ├── wireshark/
│   │   └── cyberchef/
│   └── application/      (all role dashboard screenshots)
```

---

## Common Errors & Fixes

| Error                            | Fix                                                        |
|----------------------------------|------------------------------------------------------------|
| Module not found: @clerk/nextjs  | Run: npm install @clerk/nextjs                             |
| python: command not found        | Reinstall Python, check "Add to PATH"                      |
| flutter: command not found       | Add C:\flutter\bin to System PATH                          |
| Supabase RLS blocking all queries| Pass Authorization header with Clerk JWT                   |
| Railway deployment fails         | Ensure Procfile and requirements.txt exist in flask_api/   |
| Flutter QR scanner black screen  | Add camera permission to AndroidManifest.xml               |
| Clerk redirect loop              | Add /sign-in, /sign-up, / to publicRoutes in middleware.ts |
| CORS error on API calls          | Add flask-cors: CORS(app) in app.py                        |

---

## License

Academic project — Lamrin Tech Skills University