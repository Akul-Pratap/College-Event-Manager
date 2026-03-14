# 📋 Master Plan v7.0
## College Event Management System
### Lamrin Tech Skills University

> **Total Cost: ₹0 | IDE: VS Code | Stack: Next.js 14 + Flask + Flutter + Supabase**

---

## 1. Abstract

The College Event Management System is a secure, full-stack web and mobile platform for Lamrin Tech Skills University. It handles event registration, club management, duty leave tracking, and payment collection across all departments with strict role-based access control — built entirely with free tools using VS Code.

Built with Next.js 14, Flutter, Python Flask, and Supabase PostgreSQL, the platform serves 8 user roles with separate dashboards while sharing a single unified database with department-level Row Level Security isolation. Total monthly running cost: ₹0.

---

## 2. Tech Stack — ₹0 Total

### Core Stack

| Category | Technology | Cost | Free Limit |
|---|---|---|---|
| Website Framework | Next.js 14 (App Router) | Free | Unlimited |
| Website Hosting | Vercel | Free | 100GB bandwidth/month |
| UI Library | Tailwind CSS + shadcn/ui | Free | Unlimited |
| UI Generation | v0.dev (Vercel) | Free | 200 credits |
| Animated Components | Aceternity UI + Magic UI | Free | Unlimited |
| Animations | Framer Motion | Free | Unlimited |
| Authentication | Clerk | Free | 10,000 users/month |
| Database | Supabase PostgreSQL | Free | 500MB storage |
| Image Storage | Cloudinary | Free | 25GB storage |
| Email | Resend + React Email | Free | 3,000 emails/month |
| Notifications Hub | Novu | Free | 30,000 events/month |
| Rate Limiting | Upstash Redis | Free | 10,000 requests/day |
| API Hosting | Railway | Free | No sleep, auto-deploy |
| Mobile App | Flutter (Dart) | Free | Unlimited |
| Push Notifications | Firebase FCM | Free | Unlimited |
| AI Vision + Content | Google Gemini API | Free | 1,500 requests/day |
| AI Threat + Chatbot | Groq API | Free | 500,000 tokens/day |
| AI Image Hash | Ollama (local on PC) | Free | Unlimited |
| Weather Theme | OpenWeatherMap API | Free | 1,000 calls/day |
| Calendar | Google Calendar API | Free | Unlimited |
| IDE | VS Code | Free | Unlimited |
| AI Assistant 1 | GitHub Copilot Free | Free | 2,000 completions/month |
| AI Assistant 2 | Codeium | Free | Unlimited |
| API Testing | Thunder Client (VS Code) | Free | Unlimited |
| Error Monitoring | Sentry | Free | 5,000 errors/month |
| Uptime Monitoring | UptimeRobot | Free | 50 monitors, 5 min checks |
| CI/CD | GitHub Actions | Free | 2,000 min/month |
| End-to-End Testing | Playwright | Free | Unlimited |
| Performance | Lighthouse CI | Free | Unlimited |
| Analytics | Vercel Analytics | Free | Unlimited |
| Event Logging | LogSnag | Free tier | Live event feed |
| Security Testing | Kali Linux + 7 tools | Free | Unlimited |
| **Total Monthly Cost** | — | **₹0** | — |

---

## 3. VS Code Setup

### 3.1 All 8 Extensions (Ctrl+Shift+X)

| Extension | Publisher | Purpose |
|---|---|---|
| Python | Microsoft | Flask API development |
| Flutter | Dart Code | App dev — hot reload, debug |
| Tailwind CSS IntelliSense | Bradlc | Autocomplete Tailwind classes |
| ESLint | Microsoft | Catch JS/TS errors as you type |
| Prettier | Prettier | Auto-format all code on save |
| Thunder Client | Rangav | Test Flask API inside VS Code |
| SQLite Viewer | Florian Klampfer | Browse local database |
| GitLens | GitKraken | Git history and blame inline |

### 3.2 GitHub Copilot Free
1. Extensions → search **GitHub Copilot** → Install
2. Sign in with GitHub → Free: **2,000 completions/month + 50 chat messages**
3. Open Copilot Chat: `Ctrl+Shift+I`

### 3.3 Codeium (Unlimited Free)
1. Extensions → search **Codeium** → Install
2. Go to codeium.com → create free account
3. `Ctrl+Shift+P` → **Codeium: Login**

| Tool | Completions | Best For |
|---|---|---|
| GitHub Copilot Free | 2,000/month | Complex logic, multi-file chat generation |
| Codeium | Unlimited | Everyday inline completions, boilerplate |

### 3.4 VS Code Settings (.vscode/settings.json)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "[python]": { "editor.defaultFormatter": "ms-python.python" },
  "[dart]": { "editor.defaultFormatter": "Dart-Code.dart-code" },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "["'`]([^"'`]*).*?["'`]"]
  ]
}
```

### 3.5 Complete MCP Server Config (Ctrl+Shift+P → Open User Settings JSON)

```json
{
  "github.copilot.chat.mcpServers": {

    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem",
               "C:\\Users\\YourName\\Desktop\\college_event_system"]
    },

    "fetch": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-fetch"]
    },

    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase",
               "--url", "https://yourproject.supabase.co",
               "--key", "your_service_role_key"]
    },

    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres",
               "postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres"]
    },

    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "your_token" }
    },

    "puppeteer": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-puppeteer"]
    },

    "firebase": {
      "command": "npx",
      "args": ["@gannonh/firebase-mcp"]
    },

    "memory": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-memory"]
    },

    "cloudinary": {
      "command": "npx",
      "args": ["@cloudinary/mcp-server-cloudinary"],
      "env": {
        "CLOUDINARY_CLOUD_NAME": "your_cloud",
        "CLOUDINARY_API_KEY": "your_key",
        "CLOUDINARY_API_SECRET": "your_secret"
      }
    },

    "brave-search": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-brave-search"],
      "env": { "BRAVE_API_KEY": "your_free_brave_key" }
    }
  }
}
```

### 3.6 MCP Server Guide

| MCP Server | What Copilot Can Do |
|---|---|
| filesystem | Read/write all files — Next.js, Flask, Flutter |
| fetch | Call Flask API endpoints while coding to test responses |
| supabase | Query DB, run migrations, manage RLS policies |
| postgres | Direct SQL to Supabase — faster than dashboard |
| github | Push code, create PRs, manage issues from chat |
| puppeteer | Auto-test all 8 dashboards — fill forms, click buttons |
| firebase | Manage FCM push tokens from VS Code |
| memory | Copilot remembers your schema + roles across sessions |
| cloudinary | Manage gallery images and payment screenshots |
| brave-search | Copilot searches docs while helping you code |

---

## 4. User Roles & Access Control

| Role | Scope | Key Permissions |
|---|---|---|
| Super Admin | University-wide | Global analytics, all departments, user management |
| HOD | Department-wide | Approve/reject events, request status bar, gallery |
| Faculty Coordinator | Club-specific | Club management, DL approvals, money collection |
| Class Incharge | Class-specific | Edit money collection for their class only |
| Student Organizer | Club + Event | Create events, form builder, WhatsApp drafter, panic button |
| Volunteer | Event-specific | QR scanner, attendance, offline mode, duty leave |
| Class Representative | Class-specific | Edit money collection for their class only |
| Student | Dept-wide | AI For You feed, register, waitlist, calendar, join clubs |

### 4.1 Multi-Stage Approval Workflow

```
Student Organizer creates event
        │
        ▼
Stage 1: Faculty Coordinator reviews
        │
        ▼
Stage 2: Venue conflict check (auto)
   Conflict? ──► Flag to organizer
        │ No conflict
        ▼
Stage 3: HOD approves/rejects
        │ Approved
        ▼
Event goes LIVE
  + Calendar links (Google + Outlook)
  + WhatsApp drafter unlocked
  + Reminder scheduled 1 day before
  + AI For You feed updated
```

---

## 5. Database — 22 Tables

| # | Table | Key Fields | Purpose |
|---|---|---|---|
| 1 | departments | id, name, code, hod_id | All departments |
| 2 | users | id, clerk_id, name, roll_no, email, role, department_id, year, branch, section | All accounts |
| 3 | clubs | id, name, description, logo_url, department_id | Club profiles |
| 4 | club_members | id, club_id, user_id, designation, is_permanent | Club roster |
| 5 | club_join_requests | id, club_id, user_id, request_type, status, event_id | Join applications |
| 6 | events | id, title, date, venue_id, club_id, department_id, payment_type, fee, status | All events |
| 7 | venues | id, name, capacity, is_shared | University venues |
| 8 | venue_bookings | id, venue_id, event_id, start_time, end_time, status | Conflict tracking |
| 9 | event_highlights | id, event_id, winner_name, prize, image_url | Past winners |
| 10 | form_fields | id, event_id, label, field_type, options, is_required, order_index, validation_rules | Form builder |
| 11 | form_responses | id, registration_id, field_id, answer | Student answers |
| 12 | registrations | id, student_id, event_id, status, payment_method, payment_status | Registrations |
| 13 | waitlist | id, event_id, student_id, position, notified_at | Auto waitlist |
| 14 | payments | id, registration_id, utr_number, screenshot_url, screenshot_hash, ai_verified | Payments |
| 15 | money_collection | id, event_id, year, branch, section, amount_collected | Class-wise money |
| 16 | attendance | id, registration_id, marked_by, method, timestamp | Gate entry |
| 17 | duty_leaves | id, user_id, event_id, name, class, batch, roll_no, date, start_time, end_time, status | DL records |
| 18 | approval_requests | id, event_id, stage, approver_role, status, note | Multi-stage approvals |
| 19 | gallery | id, event_id, image_url, uploaded_by, caption, type | Formal gallery |
| 20 | notifications | id, user_id, type, message, is_read | In-app notifications |
| 21 | email_logs | id, user_id, event_id, trigger_type, sent_at | Email audit |
| 22 | login_attempts | id, clerk_user_id, ip_address, attempted_at, success, flagged_by_ai | Security log |

---

## 6. Complete Feature List

### 6.1 Form Builder — All Google Form Field Types
Short Answer, Paragraph, Multiple Choice, Checkboxes, Dropdown, Linear Scale, Multiple Choice Grid, Checkbox Grid, Date, Time, File Upload, Section Headers, Image in Question, Video Embed, Page Break, Response Validation, Shuffle Options, Required Toggle, Form Deadline, Response Limit, AI Field Suggestions

### 6.2 Payment System
| Method | Flow |
|---|---|
| Free | Register → instant confirmation email via React Email + Resend |
| UPI | Organizer adds UPI ID → student opens GPay → uploads screenshot + UTR → Gemini Vision verifies → Ollama checks duplicate → organizer confirms |
| Cash | Student registers → pays in person → organizer marks paid → email sent |

### 6.3 Auto Theme System
| Time | Theme |
|---|---|
| 6am – 12pm | Morning: warm whites, soft teal |
| 12pm – 6pm | Afternoon: standard Charcoal & Teal |
| 6pm – 10pm | Evening: deep charcoal, amber highlights |
| 10pm – 6am | Night: full dark mode, teal glow |

Weather override via OpenWeatherMap: Rainy → blue-gray | Sunny → bright teal | Cloudy → muted neutrals
Manual override toggle always available in navbar.

### 6.4 Other Features
- **Venue Booking + Conflict Detection** — auto-flags overlapping bookings
- **Panic Button** — instant push to all registered attendees via Novu
- **Add to Google/Outlook Calendar** — on every event page
- **Waitlist** — auto-notifies next student when spot opens
- **Formal Gallery** — signed notice images per event
- **WhatsApp Message Drafter** — Gemini generates message + wa.me deep link
- **Duty Leave System** — form → FC approves → WhatsApp draft + email auto-sent
- **HOD Request Status Bar** — tap-to-expand approval cards
- **Money Collection Report** — Year → Branch → Section isolation
- **Club System** — designations, permanent organizers, event-specific volunteers
- **Event Analytics** — most active clubs, engagement stats
- **Previous Event Highlights** — winners, prizes, photos

---

## 7. AI Features

| Feature | API | Description |
|---|---|---|
| For You event feed | Gemini | Personalised by dept, year, interests, attendance |
| UPI screenshot verify | Gemini Vision | Confirms genuine UPI receipt |
| Duplicate screenshot | Ollama (local) | Image hash — blocks screenshot reuse |
| Login threat detection | Groq | Flags suspicious login patterns |
| Email + WhatsApp drafter | Gemini | Generates professional event content |
| Form field suggestions | Gemini | Suggests fields based on event type |
| Student chatbot | Groq | Natural language event Q&A |

---

## 8. Security — OWASP Top 10

| Risk | Protection | Status |
|---|---|---|
| A01 Broken Access Control | Role decorators + Next.js middleware + Supabase RLS | ✅ |
| A02 Cryptographic Failures | Bcrypt, AES-256 QR, HTTPS/TLS | ✅ |
| A03 Injection | SQLAlchemy ORM — zero raw SQL | ✅ |
| A04 Insecure Design | Multi-stage approval, conflict detection, AI fraud | ✅ |
| A05 Misconfiguration | Debug off, Flask-Talisman, secrets in env vars | ✅ |
| A06 Vulnerable Components | Pinned deps, Nikto scan, Sentry monitoring | ✅ |
| A07 Auth Failures | Clerk, Upstash rate limit, IP block after 10 fails | ✅ |
| A08 Integrity Failures | UTR uniqueness, Ollama hash, Gemini Vision | ✅ |
| A09 Logging & Monitoring | login_attempts, email_logs, Groq AI, Sentry | ✅ |
| A10 SSRF | Hardcoded endpoints, whitelist-only calls | ✅ |

---

## 9. Monitoring & Quality (All Free)

| Tool | Purpose | Setup |
|---|---|---|
| Sentry | Catch production errors in real time | npm install @sentry/nextjs + pip install sentry-sdk |
| UptimeRobot | Alert if Vercel or Railway goes down | uptimerobot.com → add 2 monitors |
| Vercel Analytics | Page views, performance per route | Enable in Vercel dashboard |
| Lighthouse CI | Score 90+ on performance/SEO/accessibility | GitHub Actions workflow |
| LogSnag | Live event feed — registrations, payments | logsnag.com → free tier |
| GitHub Actions | Auto-deploy + auto-test on every push | .github/workflows/deploy.yml |
| Playwright | End-to-end test all 8 role dashboards | npm install @playwright/test |

---

## 10. Security Tools (Kali Linux)

| Tool | Command | Expected Result |
|---|---|---|
| Burp Suite | Intercept POST → change ticket_count to 99 | HTTP 403 Forbidden |
| Nmap | `nmap -sV -p- localhost` | Only port 5000 open |
| SQLMap | `sqlmap -u http://localhost:5000/api/login --data='email=&password=' --level=3` | Not injectable |
| Nikto | `nikto -h http://localhost:5000` | Security headers present |
| Hydra | `hydra -l admin@ltsu.edu -P wordlist.txt localhost http-post-form '/api/login:...'` | IP blocked after 10 |
| Wireshark | Filter: http contains "Bearer" | Token visible |
| CyberChef | AES Decrypt with QR secret key | Readable ticket data |

---

## 11. 3-Day Execution Plan

### Day 1 — Setup + Next.js Website
| Step | Task |
|---|---|
| 1 | Install Node.js, Python, Flutter, Git, VS Code + all extensions + Copilot Free + Codeium |
| 2 | Create all 12 free service accounts |
| 3 | Configure all 10 MCP servers in VS Code |
| 4 | Create Next.js project + install dependencies + .env.local |
| 5 | Use v0.dev to generate all 8 dashboard UIs → paste into project |
| 6 | Add Framer Motion + Aceternity UI + Magic UI components |
| 7 | Wire up Clerk auth + department routing middleware |
| 8 | Connect Supabase client + test all role dashboards |
| 9 | Set up Sentry on Next.js + UptimeRobot monitors |

### Day 2 — Flask API + AI + Flutter
| Step | Task |
|---|---|
| 1 | Flask project + venv + install all packages + deploy to Railway |
| 2 | All 22 models + JWT middleware + RBAC decorators |
| 3 | Gemini Vision: payment verify + email + form suggestions |
| 4 | Groq: threat detection + chatbot |
| 5 | Ollama: image hash + UTR uniqueness |
| 6 | Venue conflict + multi-stage approval + panic button |
| 7 | Novu: unified notification hub (email + push + in-app) |
| 8 | React Email: all transactional email templates |
| 9 | Flutter: all screens + QR scanner + offline mode + APK build |

### Day 3 — Testing + Docs + Launch
| Step | Task |
|---|---|
| 1 | Boot Kali → run 7 security tools → 21 screenshots |
| 2 | Playwright end-to-end tests for all 8 roles |
| 3 | Lighthouse CI — achieve 90+ score |
| 4 | Website + Flutter screenshots for report |
| 5 | GitHub Actions CI/CD pipeline |
| 6 | Insert screenshots into report → generate presentation |
| 7 | Zip code + submit all deliverables |

---

## 12. Cybersecurity Checklist

| Item | Status |
|---|---|
| HTTPS enforced | ✅ |
| RBAC (8 roles) | ✅ |
| Password hashing (Bcrypt) | ✅ |
| SQL injection protection | ✅ |
| XSS protection (DOMPurify) | ✅ |
| Session handling + timeout | ✅ |
| Input validation | ✅ |
| Firewall (Railway + Vercel) | ✅ |
| Logging + monitoring (Sentry + Groq) | ✅ |
| Department data isolation (RLS) | ✅ |
| Venue conflict detection | ✅ |
| AI fraud detection | ✅ |

---

## 13. Future Improvements
- Multi-factor authentication via OTP
- Zero Trust Architecture
- Razorpay payment gateway
- iOS Flutter app
- AI-generated co-curricular certificates
- Real-time venue occupancy tracking (IoT)
- Social sharing with Open Graph preview cards
- Verified co-curricular transcript download

---

## 14. References
- OWASP Top 10 2021 — owasp.org/Top10
- Next.js 14 Docs — nextjs.org/docs
- Clerk Docs — clerk.com/docs
- Supabase RLS — supabase.com/docs/guides/auth/row-level-security
- Flask Docs — flask.palletsprojects.com
- Flutter Docs — docs.flutter.dev
- Framer Motion — framer.com/motion
- Google Gemini API — ai.google.dev/docs
- Groq API — console.groq.com/docs
- Codeium — codeium.com
- GitHub Copilot Free — github.com/features/copilot
- Thunder Client — thunderclient.com
- Sentry Docs — docs.sentry.io
- UptimeRobot — uptimerobot.com
- Novu Docs — docs.novu.co
- React Email — react.email
- v0.dev — v0.dev
- Aceternity UI — ui.aceternity.com
- Magic UI — magicui.design
- Railway Docs — docs.railway.app
