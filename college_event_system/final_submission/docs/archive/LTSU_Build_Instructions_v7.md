# 🛠️ Build Instructions v7
## College Event Management System — Developer Guide
### VS Code + GitHub Copilot Free + Codeium + Thunder Client | ₹0 | Professional Launch

---

> **Read this entire document before writing any code.**

---

## Quick Reference

| Deliverable | Tool | Deploy |
|---|---|---|
| Next.js Website (8 roles) | VS Code + v0.dev + Copilot + Codeium | Vercel (free) |
| Flask REST API | VS Code + Python extension | Railway (free) |
| Flutter Android App | VS Code + Flutter extension | APK + Firebase Distribution |
| Database (22 tables) | Supabase SQL Editor | Supabase (free) |
| Error Monitoring | Sentry | sentry.io (free) |
| Uptime Monitoring | UptimeRobot | uptimerobot.com (free) |
| CI/CD | GitHub Actions | GitHub (free) |

---

## Phase 1 — Install Software

### 1.1 Node.js v20
```bash
# Download from nodejs.org/en/download → Node.js 20 LTS
node --version   # v20.x.x
npm --version    # 10.x.x
```

### 1.2 Python 3.11
```bash
# Download from python.org/downloads → Python 3.11
# ⚠️ CHECK 'Add Python to PATH' before clicking Install
python --version   # Python 3.11.x
```

### 1.3 Git
```bash
# Download from git-scm.com/download/win
git config --global user.name "Your Name"
git config --global user.email "you@email.com"
```

### 1.4 Flutter SDK
```bash
# Download from flutter.dev → extract to C:\flutter
# Add C:\flutter\bin to System PATH
flutter doctor
flutter doctor --android-licenses
```

### 1.5 VS Code Extensions
Press `Ctrl+Shift+X` → search each → Install:

| Extension | Purpose |
|---|---|
| Python (Microsoft) | Flask development |
| Flutter (Dart Code) | App development |
| Tailwind CSS IntelliSense | Autocomplete classes |
| ESLint (Microsoft) | Catch JS/TS errors |
| Prettier | Auto-format on save |
| Thunder Client | Test API inside VS Code |
| SQLite Viewer | Browse local database |
| GitLens (GitKraken) | Git history inline |

### 1.6 GitHub Copilot Free
```
Extensions → GitHub Copilot → Install → Sign in with GitHub
Free: 2,000 completions/month + 50 chat messages
Open chat: Ctrl+Shift+I
```

### 1.7 Codeium (Unlimited Free)
```
Extensions → Codeium → Install → codeium.com → sign up
Ctrl+Shift+P → Codeium: Login
```

### 1.8 Settings (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "[python]": { "editor.defaultFormatter": "ms-python.python" },
  "[dart]": { "editor.defaultFormatter": "Dart-Code.dart-code" }
}
```

### 1.9 Complete MCP Config (Ctrl+Shift+P → Open User Settings JSON)
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
      "env": { "BRAVE_API_KEY": "your_brave_key" }
    }
  }
}
```

---

## Phase 2 — Create All Service Accounts

| Service | URL | What to Save |
|---|---|---|
| GitHub | github.com | Repo: college-event-system. Personal Access Token. |
| Vercel | vercel.com | Sign up with GitHub. |
| Supabase | supabase.com | URL, anon key, service_role key. |
| Clerk | clerk.com | Publishable Key, Secret Key. |
| Cloudinary | cloudinary.com | Cloud Name, API Key, Secret. Upload preset: ltsu_payments. |
| Resend | resend.com | API Key. |
| Upstash | upstash.com | REST URL, REST Token. |
| Railway | railway.app | Sign up with GitHub. |
| Google Gemini | aistudio.google.com | GEMINI_API_KEY |
| Groq | console.groq.com | GROQ_API_KEY |
| Firebase | console.firebase.google.com | Server Key. google-services.json. |
| OpenWeatherMap | openweathermap.org | OPENWEATHER_API_KEY |
| Sentry | sentry.io | Create 2 projects: ltsu-nextjs + ltsu-flask. Save DSN for each. |
| UptimeRobot | uptimerobot.com | Sign up. Add monitors after deploy. |
| Novu | web.novu.co | API Key. |
| LogSnag | logsnag.com | API Token, Project name. |

---

## Phase 3 — Next.js Website

### 3.1 Create Project
```bash
cd Desktop
mkdir college_event_system && cd college_event_system

npx create-next-app@latest nextjs_website --typescript --tailwind --app
cd nextjs_website

# Core
npm install @clerk/nextjs @supabase/supabase-js cloudinary
npm install resend @react-email/components
npm install @upstash/redis @upstash/ratelimit
npm install framer-motion @dnd-kit/core @dnd-kit/sortable
npm install date-fns react-hot-toast lucide-react
npm install @novu/react

# Monitoring
npm install @sentry/nextjs

# Testing
npm install -D @playwright/test
npx playwright install

# shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table badge dialog input select \
  textarea form label dropdown-menu avatar tabs toast progress skeleton sheet
```

### 3.2 .env.local
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
RESEND_API_KEY=re_xxx
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
NEXT_PUBLIC_FLASK_API_URL=https://xxx.railway.app
OPENWEATHER_API_KEY=xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NOVU_API_KEY=xxx
LOGSNAG_TOKEN=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.3 Set Up Sentry (Next.js)
```bash
npx @sentry/wizard@latest -i nextjs
# Follow prompts — it auto-configures everything
```

### 3.4 Use v0.dev to Build Dashboards Fast
```
# Go to v0.dev — paste these prompts one by one:

HOD Dashboard:
"Create HOD approval dashboard. Dark charcoal sidebar, teal accent.
Pending event request cards with subject, club name, date, status badge.
Tap card to expand full request. Approve (green) and Reject (red) buttons.
Use shadcn/ui and Tailwind CSS."

Student Dashboard:
"Create student event feed. Card grid with event banner image, title,
date countdown timer, club name badge, register button in teal.
Include AI For You section at top. Dark/light mode toggle.
Use shadcn/ui and Tailwind."

Organizer Dashboard:
"Create event organizer dashboard. Stats cards (total events, registrations,
revenue). Event list table with status badges. Create Event button.
Sidebar navigation. Teal and charcoal theme. shadcn/ui."

# Copy the generated code → paste into your Next.js pages
```

### 3.5 Add Aceternity UI + Magic UI Components
```bash
# Aceternity UI (animated components)
# Go to ui.aceternity.com → copy any component → paste directly

# Magic UI (Framer Motion components)
# Go to magicui.design → copy component → paste directly

# Both are free, no install needed — just copy the component code
```

### 3.6 Build Order + Copilot Prompts

| Page | Copilot Chat Prompt |
|---|---|
| middleware.ts | Write Next.js middleware using Clerk that protects /dashboard routes and redirects to /dashboard/[dept]/[role] based on Clerk publicMetadata |
| lib/weather.ts | Fetch OpenWeatherMap current weather by coordinates. Return time-of-day (morning/afternoon/evening/night) and weather condition. Apply matching CSS theme class to document root. |
| app/page.tsx | Landing page with Framer Motion hero, upcoming events grid with countdown timers, past event highlights with winners. Charcoal teal theme. |
| dashboard/student/ | Student dashboard: AI For You feed, stagger-animated event cards, register flow, waitlist badge |
| dashboard/organizer/ | Organizer: create event + venue conflict checker + full Google Form builder with drag-drop + WhatsApp drafter + panic button with confirm dialog |
| dashboard/hod/ | HOD: request status bar with approval cards, expand on tap, approve/reject |
| dashboard/faculty-coordinator/ | Faculty coordinator: club members + designations, DL approval queue, money collection by Year/Branch/Section |
| dashboard/volunteer/ | Volunteer: QR scanner, manual attendance, offline fail-secure mode |
| dashboard/super-admin/ | Super admin: university analytics (recharts), all departments, user management |

### 3.7 Testing with Playwright
```typescript
// tests/student.spec.ts
import { test, expect } from '@playwright/test';

test('student can browse events', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.getByText('Upcoming Events')).toBeVisible();
});

test('organizer dashboard protected', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/cs/organizer');
  await expect(page).toHaveURL(/sign-in/);
});
```
```bash
npx playwright test
```

---

## Phase 4 — Flask API

### 4.1 Setup
```bash
cd ..
mkdir flask_api && cd flask_api

python -m venv venv
venv\Scripts\activate

pip install flask flask-cors flask-limiter flask-talisman
pip install supabase python-jose[cryptography] bcrypt
pip install pycryptodome qrcode[pil] pillow
pip install google-generativeai groq requests python-dotenv
pip install gunicorn sentry-sdk[flask]

pip freeze > requirements.txt
```

### 4.2 .env
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
GEMINI_API_KEY=xxx
GROQ_API_KEY=xxx
QR_SECRET_KEY=your_32_char_secret
FIREBASE_SERVER_KEY=xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
NOVU_API_KEY=xxx
LOGSNAG_TOKEN=xxx
FLASK_ENV=development
```

### 4.3 Sentry in Flask (app.py)
```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FlaskIntegration()],
    traces_sample_rate=1.0
)
```

### 4.4 Testing with Thunder Client
```
Thunder Client icon (⚡) in VS Code sidebar
→ New Collection: LTSU Flask API
→ Add requests:

GET  http://localhost:5000/api/health
POST http://localhost:5000/api/events
POST http://localhost:5000/api/ai/chatbot
POST http://localhost:5000/api/qr/generate
POST http://localhost:5000/api/payments/verify
```

### 4.5 Deploy to Railway
```bash
echo "web: gunicorn app:app" > Procfile
echo "python-3.11.0" > runtime.txt
pip install gunicorn && pip freeze > requirements.txt

git add . && git commit -m "Flask API ready"
git push origin main

# Railway: New Project → GitHub Repo → Root: flask_api/
# Add all .env variables in Railway Variables tab
```

---

## Phase 5 — Monitoring Setup

### 5.1 UptimeRobot
```
1. Go to uptimerobot.com → sign up free
2. Add Monitor → HTTP(s) → your Vercel URL → every 5 min
3. Add Monitor → HTTP(s) → your Railway URL → every 5 min
4. Set alert: email if down for 1 minute
```

### 5.2 GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: CI/CD

on:
  push:
    branches: [main]

jobs:
  test-nextjs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: cd nextjs_website && npm ci && npm run build

  deploy-flask:
    runs-on: ubuntu-latest
    needs: test-nextjs
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up --service flask-api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 5.3 Lighthouse CI
```yaml
# Add to .github/workflows/deploy.yml
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://your-project.vercel.app
          budgetPath: ./budget.json
```

### 5.4 React Email Templates
```tsx
// emails/EventConfirmation.tsx
import { Html, Button, Text, Heading, Section } from '@react-email/components'

export default function EventConfirmation({ studentName, eventName, eventDate, eventVenue }) {
  return (
    <Html>
      <Section style={{ backgroundColor: '#1F2937', padding: '40px' }}>
        <Heading style={{ color: '#0D9488' }}>Registration Confirmed!</Heading>
        <Text style={{ color: '#ffffff' }}>Hi {studentName},</Text>
        <Text style={{ color: '#D1D5DB' }}>
          You are registered for <strong>{eventName}</strong>
        </Text>
        <Text style={{ color: '#D1D5DB' }}>📅 {eventDate} | 📍 {eventVenue}</Text>
        <Button
          href="https://ltsu.vercel.app/dashboard/student/my-events"
          style={{ backgroundColor: '#0D9488', color: '#fff', padding: '12px 24px' }}
        >
          View My Registration
        </Button>
      </Section>
    </Html>
  )
}
```

---

## Phase 6 — Flutter App

### 6.1 Create + Setup
```bash
cd ..
flutter create flutter_app --org com.ltsu --project-name ltsu_events
cd flutter_app
# Copy google-services.json to android/app/
```

### 6.2 pubspec.yaml
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  shared_preferences: ^2.2.0
  mobile_scanner: ^3.5.0
  image_picker: ^1.0.0
  provider: ^6.1.0
  jwt_decoder: ^2.0.0
  connectivity_plus: ^5.0.0
  firebase_core: ^2.24.0
  firebase_messaging: ^14.7.0
  flutter_local_notifications: ^16.0.0
  cached_network_image: ^3.3.0
  intl: ^0.18.0
```
```bash
flutter pub get
flutter run    # F5 in VS Code
```

---

## Phase 7 — Supabase RLS Setup

```sql
-- Run in Supabase SQL Editor for every table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Department isolation
CREATE POLICY dept_isolation ON events FOR ALL USING (
  department_id = (
    SELECT department_id FROM users
    WHERE clerk_id = auth.jwt() ->> 'sub'
  )
);

-- Super admin bypass
CREATE POLICY super_admin ON events FOR ALL USING (
  (SELECT role FROM users
   WHERE clerk_id = auth.jwt() ->> 'sub') = 'super_admin'
);

-- Class isolation for money_collection
CREATE POLICY class_only ON money_collection FOR ALL USING (
  year = (SELECT year FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  AND branch = (SELECT branch FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  AND section = (SELECT section FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
);
```

---

## Phase 8 — Security Testing (Kali Linux)

> ⚠️ Test only against localhost — never against production.

| Tool | Command | Screenshots |
|---|---|---|
| Burp Suite | Intercept POST → modify value | Setup, modified request, 403 response |
| Nmap | `nmap -sV -p- 192.168.1.x` | Terminal, command, results |
| SQLMap | `sqlmap -u 'http://192.168.1.x:5000/api/login' --data='email=&password=' --level=3` | Running, command, not injectable |
| Nikto | `nikto -h http://192.168.1.x:5000` | Setup, command, headers report |
| Hydra | `hydra -l admin@ltsu.edu -P wordlist.txt 192.168.1.x http-post-form '/api/login:...'` | Setup, running, IP blocked |
| Wireshark | Filter: `http contains "Bearer"` | Capturing, request, token in packet |
| CyberChef | AES Decrypt with QR secret key | Open, encrypted, decrypted |

---

## Final Checklist

### Code
- [ ] `npm run build` no errors
- [ ] All Thunder Client tests return 200
- [ ] Flutter APK: `flutter build apk --release`
- [ ] All 8 roles tested with separate Clerk accounts
- [ ] Department isolation confirmed
- [ ] Sentry receiving events from both Next.js and Flask
- [ ] UptimeRobot monitoring both URLs

### Security
- [ ] 21 Kali screenshots (3 per tool)
- [ ] Playwright tests passing
- [ ] Lighthouse score 90+

### Deliverables
- [ ] report.docx complete
- [ ] presentation.pptx — 18 slides
- [ ] code.zip
- [ ] app-release.apk

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| Module not found | Dependency missing | `npm install [package-name]` |
| python: not found | PATH not set | Reinstall Python with PATH checkbox |
| flutter: not found | PATH not set | Add C:\flutter\bin to System PATH |
| Supabase RLS blocks all | JWT not passed | Pass Authorization header with Clerk JWT |
| Railway deploy fails | Missing Procfile | Create Procfile: `web: gunicorn app:app` |
| Clerk redirect loop | middleware.ts wrong | Add public routes to publicRoutes array |
| CORS error on API | Flask missing CORS | `from flask_cors import CORS; CORS(app)` |
| Sentry not receiving | DSN wrong | Copy DSN from Sentry project settings |
| Playwright tests fail | App not running | Start `npm run dev` before running tests |
