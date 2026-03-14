# 🔧 Tech Stack Setup Guide
## College Event Management System — LTSU
### Account Signup + Configuration + API Keys — All 16 Services | ₹0

---

> **Use the SAME Google account and SAME GitHub account across all services. Fill in the Master ENV file as you go.**

---

## Master Environment Variables

Keep this open. Fill in each value as you complete each service.

### nextjs_website/.env.local
```env
# CLERK AUTH
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# CLOUDINARY
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# RESEND EMAIL
RESEND_API_KEY=

# UPSTASH REDIS
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# FLASK API
NEXT_PUBLIC_FLASK_API_URL=

# OPENWEATHERMAP
OPENWEATHER_API_KEY=

# SENTRY
NEXT_PUBLIC_SENTRY_DSN=

# NOVU
NOVU_API_KEY=

# LOGSNAG
LOGSNAG_TOKEN=

# APP
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### flask_api/.env
```env
# SUPABASE
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# AI
GEMINI_API_KEY=
GROQ_API_KEY=

# SECURITY
QR_SECRET_KEY=
FLASK_SECRET_KEY=

# FIREBASE
FIREBASE_SERVER_KEY=

# MONITORING
SENTRY_DSN=

# NOTIFICATIONS
NOVU_API_KEY=
LOGSNAG_TOKEN=

# FLASK
FLASK_ENV=development
```

---

## Service Index

| # | Service | URL | Cost | Purpose |
|---|---|---|---|---|
| 1 | GitHub | github.com | Free | Code repo + CI/CD |
| 2 | Vercel | vercel.com | Free | Website hosting |
| 3 | Supabase | supabase.com | Free | Database |
| 4 | Clerk | clerk.com | Free | Authentication |
| 5 | Cloudinary | cloudinary.com | Free | Image storage |
| 6 | Resend | resend.com | Free | Email sending |
| 7 | Upstash | upstash.com | Free | Rate limiting |
| 8 | Railway | railway.app | Free | Flask API hosting |
| 9 | Google Gemini | aistudio.google.com | Free | AI features |
| 10 | Groq | console.groq.com | Free | AI chatbot + threat |
| 11 | Firebase | console.firebase.google.com | Free | Push notifications |
| 12 | OpenWeatherMap | openweathermap.org | Free | Auto theme |
| 13 | Sentry | sentry.io | Free | Error monitoring |
| 14 | UptimeRobot | uptimerobot.com | Free | Uptime monitoring |
| 15 | Novu | web.novu.co | Free | Unified notifications |
| 16 | LogSnag | logsnag.com | Free | Event logging |

---

## 1. GitHub
**URL:** github.com | **Cost:** Free

### 1.1 Create Account
1. Go to github.com → click **Sign up**
2. Enter email → create password → choose username
3. Verify email

### 1.2 Create Repository
1. Click **+** icon → New repository
2. Name: `college-event-system`
3. Set to **Public** → check **Add a README file**
4. Click **Create repository**

### 1.3 Generate Personal Access Token
1. Profile picture → Settings → Developer settings
2. Personal access tokens → Tokens (classic) → **Generate new token (classic)**
3. Note: LTSU Event System MCP | Expiration: **No expiration**
4. Scopes: check **repo**, **workflow**, **read:org**
5. Click **Generate token** → copy immediately

> ❌ **SAVE:** `GITHUB_TOKEN=ghp_xxxxxxxxxxxx`
> ⚠️ Token shown only once — copy before closing.

---

## 2. Vercel
**URL:** vercel.com | **Cost:** Free — 100GB bandwidth/month

### 2.1 Create Account
1. Go to vercel.com → **Sign Up**
2. Select **Continue with GitHub** → authorize
3. Select **Hobby plan** (free)

### 2.2 Import Repository *(After Next.js is built)*
1. Click **Add New Project** → find college-event-system → **Import**
2. Set Root Directory: `nextjs_website/`
3. Add all environment variables from .env.local
4. Click **Deploy**

> ✅ Website live at: yourproject.vercel.app

### 2.3 Enable Vercel Analytics
Project dashboard → **Analytics** tab → **Enable**

---

## 3. Supabase
**URL:** supabase.com | **Cost:** Free — 500MB database

### 3.1 Create Account
Go to supabase.com → **Start your project** → Sign in with GitHub

### 3.2 Create Project
1. Click **New project**
2. Name: `ltsu-events`
3. Database password: create strong password → **save it**
4. Region: **Southeast Asia (Singapore)**
5. Click **Create new project** → wait 2 minutes

### 3.3 Get API Keys
Project Settings → **API** tab → copy:

> ❌ **SAVE:** `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
> ❌ **SAVE:** `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`
> ❌ **SAVE:** `SUPABASE_SERVICE_KEY=eyJhbGci...` *(service_role key)*

> ⚠️ Never expose service_role key in frontend code.

### 3.4 Get Postgres Connection String *(for MCP)*
Project Settings → **Database** tab → Connection string → **URI** tab

> ❌ **SAVE:** `POSTGRES_URL=postgresql://postgres:yourpassword@db.xxxx.supabase.co:5432/postgres`

### 3.5 Create Tables
1. Go to **SQL Editor** tab in Supabase
2. Use Copilot Chat to generate CREATE TABLE SQL for all 22 tables
3. Paste and run in SQL Editor
4. Enable RLS on all tables

---

## 4. Clerk
**URL:** clerk.com | **Cost:** Free — 10,000 users/month

### 4.1 Create Account
Go to clerk.com → Sign up (or sign in with GitHub)

### 4.2 Create Application
1. Click **Create application**
2. Name: `LTSU Events`
3. Sign-in methods: Email + Google + Username
4. Click **Create application**

### 4.3 Get API Keys
Configure → **API Keys**:

> ❌ **SAVE:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx`
> ❌ **SAVE:** `CLERK_SECRET_KEY=sk_test_xxx`

### 4.4 Configure JWT for Supabase
Configure → **JWT Templates** → **New template** → select **Supabase** → Apply changes

### 4.5 Set User Roles (Public Metadata)
```json
// Clerk Dashboard → Users → click user → Metadata → Public
{ "role": "student", "department": "computer-science" }
{ "role": "hod", "department": "computer-science" }
{ "role": "organizer", "department": "computer-science" }
{ "role": "faculty_coordinator", "department": "computer-science" }
{ "role": "volunteer", "department": "computer-science" }
{ "role": "super_admin", "department": "all" }
```

---

## 5. Cloudinary
**URL:** cloudinary.com | **Cost:** Free — 25GB storage

### 5.1 Create Account
Go to cloudinary.com → **Sign up for free** → verify email

### 5.2 Get API Keys
Cloudinary Dashboard → Account Details panel:

> ❌ **SAVE:** `CLOUDINARY_CLOUD_NAME=your_cloud_name`
> ❌ **SAVE:** `CLOUDINARY_API_KEY=123456789012345`
> ❌ **SAVE:** `CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxx`

### 5.3 Create Upload Preset for Payments
Settings → Upload → **Add upload preset**:
- Name: `ltsu_payments` | Mode: **Signed** | Folder: payments
- Allowed formats: **jpg, jpeg, png only** | Max size: 5MB
- Click **Save**

### 5.4 Create Upload Preset for Gallery
- Name: `ltsu_gallery` | Folder: gallery
- Allowed formats: jpg, jpeg, png
- Click **Save**

---

## 6. Resend
**URL:** resend.com | **Cost:** Free — 3,000 emails/month

### 6.1 Create Account
Go to resend.com → **Sign up** → verify email

### 6.2 Get API Key
API Keys → **Create API Key** → Name: LTSU Event System → Full Access → **Add**

> ❌ **SAVE:** `RESEND_API_KEY=re_xxxxxxxxxxxx`

> ℹ️ For testing, use default `onboarding@resend.dev` sender — no domain needed.

---

## 7. Upstash
**URL:** upstash.com | **Cost:** Free — 10,000 requests/day

### 7.1 Create Account
Go to upstash.com → **Sign up** (use GitHub)

### 7.2 Create Redis Database
1. Click **Create Database**
2. Name: `ltsu-rate-limit`
3. Type: Regional | Region: **ap-south-1 (Mumbai)**
4. Free tier → **Create**

### 7.3 Get REST Credentials
Click database → **Details** tab → REST API section:

> ❌ **SAVE:** `UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io`
> ❌ **SAVE:** `UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxx`

---

## 8. Railway
**URL:** railway.app | **Cost:** Free — no sleep

### 8.1 Create Account
Go to railway.app → **Login with GitHub** → authorize

### 8.2 Deploy Flask *(After Flask is built)*
1. **New Project** → Deploy from GitHub repo
2. Select college-event-system → Root Directory: `flask_api/`
3. Railway auto-detects Python → builds automatically

### 8.3 Add Environment Variables
Service → **Variables** tab → add each Flask .env variable

### 8.4 Get Railway URL
Settings → Networking → **Generate Domain** → copy URL

> ❌ **SAVE:** `NEXT_PUBLIC_FLASK_API_URL=https://your-service.railway.app`

---

## 9. Google Gemini API
**URL:** aistudio.google.com | **Cost:** Free — 1,500 requests/day

### 9.1 Get API Key
1. Go to aistudio.google.com → sign in with Google
2. Click **Get API key** → **Create API key in new project**
3. Copy the key

> ❌ **SAVE:** `GEMINI_API_KEY=AIzaSy_xxxxxxxxxxxx`

### 9.2 Verify It Works
```bash
python -c "
import google.generativeai as genai
genai.configure(api_key='YOUR_KEY_HERE')
model = genai.GenerativeModel('gemini-1.5-flash')
r = model.generate_content('Say hello')
print(r.text)
"
# Should print: Hello! or similar
```

---

## 10. Groq API
**URL:** console.groq.com | **Cost:** Free — 500,000 tokens/day

### 10.1 Create Account
Go to console.groq.com → **Sign up** → verify email

### 10.2 Get API Key
API Keys → **Create API Key** → Name: LTSU Event System → **Submit**

> ❌ **SAVE:** `GROQ_API_KEY=gsk_xxxxxxxxxxxx`

### 10.3 Verify It Works
```bash
python -c "
from groq import Groq
client = Groq(api_key='YOUR_KEY_HERE')
chat = client.chat.completions.create(
    messages=[{'role': 'user', 'content': 'Say hello'}],
    model='llama3-8b-8192'
)
print(chat.choices[0].message.content)
"
```

---

## 11. Firebase
**URL:** console.firebase.google.com | **Cost:** Free — unlimited push

### 11.1 Create Project
1. Click **Add project** → Name: `ltsu-events`
2. Disable Google Analytics → **Create project**

### 11.2 Get Server Key
Project Settings → **Cloud Messaging** tab → Server key:

> ❌ **SAVE:** `FIREBASE_SERVER_KEY=AAAAxxxxxxxx...`

### 11.3 Register Android App
1. Project Overview → click **Android icon**
2. Package name: `com.ltsu.events` | Nickname: LTSU Events
3. **Register app** → **Download google-services.json**
4. Save file → place in `flutter_app/android/app/` later

> ❌ **SAVE:** Keep google-services.json file safe

---

## 12. OpenWeatherMap
**URL:** openweathermap.org | **Cost:** Free — 1,000 calls/day

### 12.1 Create Account
openweathermap.org → **Sign in** → **Create an Account** → verify email

### 12.2 Get API Key
Username (top right) → **My API keys** → copy default key (or Generate new)

> ❌ **SAVE:** `OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

> ⚠️ New keys take up to 2 hours to activate.

### 12.3 Test
```
https://api.openweathermap.org/data/2.5/weather?q=Ludhiana&appid=YOUR_KEY
# Should return weather JSON for Ludhiana
```

---

## 13. Sentry
**URL:** sentry.io | **Cost:** Free — 5,000 errors/month

### 13.1 Create Account
sentry.io → **Get Started** → Sign up with GitHub → Organization: LTSU

### 13.2 Create Next.js Project
Create Project → select **Next.js** → Name: `ltsu-nextjs` → Create

> ❌ **SAVE:** `NEXT_PUBLIC_SENTRY_DSN=https://xxxx@o123.ingest.sentry.io/xxxx`

### 13.3 Create Flask Project
Create Project → select **Flask** → Name: `ltsu-flask` → Create

> ❌ **SAVE:** `SENTRY_DSN=https://xxxx@o123.ingest.sentry.io/xxxx` *(different DSN)*

### 13.4 Install
```bash
# Next.js
cd nextjs_website
npx @sentry/wizard@latest -i nextjs

# Flask
cd ../flask_api
pip install sentry-sdk[flask]
```
```python
# app.py
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[FlaskIntegration()],
    traces_sample_rate=1.0
)
```

---

## 14. UptimeRobot
**URL:** uptimerobot.com | **Cost:** Free — 50 monitors

### 14.1 Create Account
uptimerobot.com → **Register for FREE** → verify email

### 14.2 Add Vercel Monitor *(after deploying)*
Add New Monitor → HTTP(s):
- Name: LTSU Website (Vercel)
- URL: https://your-project.vercel.app
- Interval: Every 5 minutes

### 14.3 Add Railway Monitor
Add New Monitor → HTTP(s):
- Name: LTSU Flask API (Railway)
- URL: https://your-service.railway.app/api/health
- Interval: Every 5 minutes

> ✅ You will receive instant email alerts when either service goes down.

---

## 15. Novu
**URL:** web.novu.co | **Cost:** Free — 30,000 events/month

### 15.1 Create Account
web.novu.co → **Get Started Free** → sign up → Organization: LTSU

### 15.2 Get API Key
Settings → **API Keys** → copy

> ❌ **SAVE:** `NOVU_API_KEY=xxxxxxxxxxxx`

### 15.3 Connect Email (Resend)
Integrations → Email → **Resend** → paste RESEND_API_KEY → Save

### 15.4 Connect Push (Firebase)
Integrations → Push → **Firebase Cloud Messaging** → paste FIREBASE_SERVER_KEY → Save

### 15.5 Create Workflows
| Workflow | Trigger | Channels |
|---|---|---|
| event-registration | Student registers | Email + In-app |
| event-reminder | 1 day before event | Email + Push + In-app |
| payment-verified | Payment confirmed | Email + In-app |
| dl-approved | DL request approved | Email + In-app |
| event-approved | HOD approves event | Email + In-app |
| panic-alert | Panic button pressed | Push + In-app |
| waitlist-spot-open | Spot available | Email + Push + In-app |
| club-join-approved | Club request approved | Email + In-app |

---

## 16. LogSnag
**URL:** logsnag.com | **Cost:** Free tier

### 16.1 Create Account
logsnag.com → **Get Started** → sign up

### 16.2 Create Project
New Project → Name: `ltsu-events` → Create

### 16.3 Get API Token
Settings → **API** → copy token

> ❌ **SAVE:** `LOGSNAG_TOKEN=xxxxxxxxxxxx`

### 16.4 Create Channels
Settings → Channels → Add:
- `registrations` - `payments` - `security` - `errors` - `events` - `notifications`

### 16.5 Usage in Flask
```python
import requests, os

def log_event(channel, event, description, icon='📌', notify=False):
    requests.post('https://api.logsnag.com/v1/log',
        headers={'Authorization': f'Bearer {os.getenv("LOGSNAG_TOKEN")}'},
        json={'project': 'ltsu-events', 'channel': channel,
              'event': event, 'description': description,
              'icon': icon, 'notify': notify})

# Examples
log_event('registrations', 'New Registration', f'{name} registered for {event}', '🎉')
log_event('security', 'Login Blocked', f'IP {ip} blocked after 10 fails', '🚨', True)
log_event('payments', 'Payment Verified', f'₹{amount} verified for {event}', '💰')
```

---

## Generate Security Keys

```bash
# Run each separately in VS Code terminal — must be different values
python -c "import secrets; print(secrets.token_hex(32))"
# → copy output → QR_SECRET_KEY

python -c "import secrets; print(secrets.token_hex(32))"
# → copy output → FLASK_SECRET_KEY
```

---

## Quick Verification Checklist

| Service | Check | Expected |
|---|---|---|
| GitHub | `git remote -v` | Shows github.com repo |
| Supabase | SQL Editor → `SELECT NOW()` | Returns timestamp |
| Clerk | Dashboard loads | Shows 0 users |
| Cloudinary | Dashboard loads | Shows 0 storage |
| Resend | API Keys tab | Key listed as Active |
| Upstash | Dashboard loads | Shows empty database |
| Gemini | Run Section 9.2 test | Prints Hello |
| Groq | Run Section 10.3 test | Prints Hello |
| Firebase | Cloud Messaging tab | Shows Server Key |
| OpenWeatherMap | Test URL in browser | Returns weather JSON |
| Sentry | Run wizard command | Configures without errors |
| Novu | Workflows tab loads | Dashboard loads |
| LogSnag | Project dashboard | Channels listed |

---

## .gitignore Setup

> ❌ **Never commit .env files to GitHub. Set this up FIRST before adding any keys.**

### nextjs_website/.gitignore
```
.env.local
.env.production
.env*.local
node_modules/
.next/
out/
*.log
```

### flask_api/.gitignore
```
.env
venv/
__pycache__/
*.pyc
instance/
*.log
```

### flutter_app/.gitignore
```
android/app/ltsu_events.keystore
android/key.properties
*.jks
build/
.dart_tool/
.flutter-plugins
```

> ✅ Run `git add .gitignore && git commit -m "Add gitignore"` BEFORE adding any .env files.
