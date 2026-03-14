# 🛠️ Build Instructions v6
## College Event Management System — Developer Guide
### VS Code + GitHub Copilot Free + Codeium + Thunder Client | ₹0

---

> **Read this entire document before writing any code. Skipping steps causes hard-to-fix errors.**

---

## Quick Reference

| Deliverable | Tool | Deploy |
|---|---|---|
| Next.js Website (8 roles) | VS Code + Copilot Free + Codeium | Vercel (free) |
| Flask REST API | VS Code + Python extension | Railway (free) |
| Flutter Android App | VS Code + Flutter extension | APK + Firebase Distribution |
| Database (22 tables) | Supabase SQL Editor | Supabase (free) |
| API Testing | Thunder Client in VS Code | Local only |
| Security Testing | Kali Linux (dual boot) | Local only |

---

## Phase 1 — Install Software

### 1.1 Node.js v20
1. Go to nodejs.org/en/download → download Node.js 20 LTS
2. Run installer — check **Add to PATH** → Install
3. Verify in VS Code terminal (`Ctrl+```):

```bash
node --version   # v20.x.x
npm --version    # 10.x.x
```

### 1.2 Python 3.11
1. Go to python.org/downloads → download Python 3.11
2. ⚠️ **CHECK 'Add Python to PATH'** at the bottom before clicking Install
3. Verify:

```bash
python --version   # Python 3.11.x
```

> **WARNING: If you forget PATH checkbox, uninstall and reinstall Python.**

### 1.3 Git
1. Go to git-scm.com/download/win → install with defaults

```bash
git config --global user.name "Your Name"
git config --global user.email "you@email.com"
```

### 1.4 Flutter SDK
1. Go to flutter.dev → download SDK zip → extract to `C:\flutter`
2. Add `C:\flutter\bin` to System PATH (search 'Environment Variables' in Windows)
3. Download Android Studio for Android SDK only (you won't code in Android Studio)

```bash
flutter doctor
flutter doctor --android-licenses   # accept all with 'y'
```

### 1.5 VS Code Extensions
Open VS Code → press `Ctrl+Shift+X` → search each name → Install:

| Extension | Search For | What It Does |
|---|---|---|
| Python | Python (Microsoft) | Flask dev — syntax, linting, debug |
| Flutter | Flutter (Dart Code) | App dev — hot reload, debug, run |
| Tailwind CSS IntelliSense | Tailwind CSS IntelliSense | Autocomplete classes |
| ESLint | ESLint (Microsoft) | Catch JS/TS errors |
| Prettier | Prettier - Code formatter | Auto-format on save |
| Thunder Client | Thunder Client | Test API inside VS Code — free Postman |
| SQLite Viewer | SQLite Viewer (Florian) | Browse local database |
| GitLens | GitLens (GitKraken) | Git blame and history inline |

### 1.6 GitHub Copilot Free
1. Extensions → search **GitHub Copilot** → Install
2. Sign in with GitHub when prompted
3. Free: **2,000 completions/month + 50 Copilot Chat messages**
4. Open chat: `Ctrl+Shift+I`

> **Tip: Use Copilot Chat for generating whole components. Save completions for logic-heavy code.**

### 1.7 Codeium (Unlimited Free)
1. Extensions → search **Codeium** → Install
2. Go to codeium.com → sign up free
3. `Ctrl+Shift+P` → **Codeium: Login** → sign in

| Tool | Completions | Best For |
|---|---|---|
| GitHub Copilot Free | 2,000/month | Complex logic, multi-file chat generation |
| Codeium | Unlimited | Everyday inline completions, boilerplate |

### 1.8 Prettier Config (.vscode/settings.json)
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

---

## Phase 2 — Create All Service Accounts

> All accounts are free. Use the same Google/GitHub account for all.

| Service | URL | What to Save |
|---|---|---|
| GitHub | github.com | Create repo: college-event-system. Generate Personal Access Token. |
| Vercel | vercel.com | Sign up with GitHub. |
| Supabase | supabase.com | Project: ltsu-events. Save: URL, anon key, service_role key. |
| Clerk | clerk.com | App: LTSU Events. Save: Publishable Key, Secret Key. |
| Cloudinary | cloudinary.com | Save: Cloud Name, API Key, Secret. Create upload preset: ltsu_payments. |
| Resend | resend.com | Save: API Key. |
| Upstash | upstash.com | Redis in Mumbai. Save: REST URL, REST Token. |
| Railway | railway.app | Sign up with GitHub. |
| Google Gemini | aistudio.google.com | Save: API Key as GEMINI_API_KEY. |
| Groq | console.groq.com | Save: API Key as GROQ_API_KEY. |
| Firebase | console.firebase.google.com | Project: ltsu-events. Enable FCM. Save: Server Key. Download google-services.json. |
| OpenWeatherMap | openweathermap.org/api | Save: API Key as OPENWEATHER_API_KEY. |

---

## Phase 3 — Next.js Website

### 3.1 Create Project (VS Code Terminal)
```bash
cd Desktop
mkdir college_event_system && cd college_event_system

npx create-next-app@latest nextjs_website --typescript --tailwind --app
cd nextjs_website

npm install @clerk/nextjs @supabase/supabase-js cloudinary
npm install resend @upstash/redis @upstash/ratelimit
npm install framer-motion @dnd-kit/core @dnd-kit/sortable
npm install date-fns react-hot-toast lucide-react

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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> ⚠️ **Add .env.local to .gitignore before first git commit.**

### 3.3 Testing with Thunder Client
1. Click **Thunder Client** icon in VS Code sidebar (lightning bolt ⚡)
2. Click **New Request** → GET → `http://localhost:3000/api/health` → Send
3. Create a Collection: **LTSU Next.js API** to save all test requests
4. Add Authorization header: `Bearer [your Clerk JWT]`

### 3.4 Build Pages — Copilot Chat Prompts

| Page | Copilot Chat Prompt |
|---|---|
| middleware.ts | Write Next.js middleware using Clerk that protects /dashboard routes and redirects to /dashboard/[dept]/[role] based on Clerk publicMetadata |
| app/page.tsx | Create landing page with Framer Motion hero, upcoming events grid with countdown, past event highlights with winners. Charcoal and teal scheme. |
| dashboard/student/ | Create student dashboard: AI For You feed calling /api/ai/feed, event cards with stagger animation, register button, waitlist badge |
| dashboard/organizer/ | Create organizer: create event + venue picker, drag-drop form builder with all Google Form field types, WhatsApp drafter, panic button with confirmation dialog |
| dashboard/hod/ | Create HOD: request status bar with pending approval cards, tap to expand, approve and reject buttons |
| dashboard/faculty-coordinator/ | Create faculty coordinator: club member management, duty leave approval queue, money collection by Year/Branch/Section |
| dashboard/volunteer/ | Create volunteer: QR camera scanner, manual attendance, offline fail-secure mode |
| dashboard/super-admin/ | Create super admin: university analytics charts (recharts), all departments, user management table |

---

## Phase 4 — Flask API

### 4.1 Setup (VS Code Terminal)
```bash
cd ..
mkdir flask_api && cd flask_api

python -m venv venv
venv\Scripts\activate
# (venv) appears in terminal

pip install flask flask-cors flask-limiter flask-talisman
pip install supabase python-jose[cryptography] bcrypt
pip install pycryptodome qrcode[pil] pillow
pip install google-generativeai groq requests python-dotenv

pip freeze > requirements.txt
```

### 4.2 .env (Flask)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
GEMINI_API_KEY=xxx
GROQ_API_KEY=xxx
QR_SECRET_KEY=your_32_char_secret
FIREBASE_SERVER_KEY=xxx
FLASK_ENV=development
```

### 4.3 Testing with Thunder Client
```
# Start Flask: python app.py
# Open Thunder Client → New Collection: LTSU Flask API
# Add and test:

GET  http://localhost:5000/api/health
POST http://localhost:5000/api/events
POST http://localhost:5000/api/ai/chatbot
POST http://localhost:5000/api/qr/generate
POST http://localhost:5000/api/payments/verify
```

### 4.4 Deploy to Railway
```bash
# Create Procfile in flask_api/
echo "web: gunicorn app:app" > Procfile
echo "python-3.11.0" > runtime.txt

pip install gunicorn
pip freeze > requirements.txt

# Push to GitHub
cd .. && git add . && git commit -m "Add Flask API"
git push origin main

# In Railway: New Project → GitHub Repo → Root: flask_api/
# Add all .env variables in Railway Variables tab
# Copy Railway URL → update NEXT_PUBLIC_FLASK_API_URL in Vercel
```

---

## Phase 5 — Flutter App

### 5.1 Create Project
```bash
cd ..
flutter create flutter_app --org com.ltsu --project-name ltsu_events
cd flutter_app
# Copy google-services.json to android/app/
```

### 5.2 pubspec.yaml
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

### 5.3 Run in VS Code
- Press **F5** to run on emulator
- Hot reload: press **r** in terminal or save any file
- Hot restart: press **R**

---

## Phase 6 — Supabase Database

```sql
-- Run in Supabase SQL Editor for EVERY table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Department isolation policy
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

-- Money collection class isolation
CREATE POLICY class_isolation ON money_collection FOR ALL USING (
  year = (SELECT year FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  AND branch = (SELECT branch FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  AND section = (SELECT section FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
);
```

---

## Phase 7 — Security Testing (Kali Linux)

> ⚠️ **Test only against localhost. Never test against live production URL.**

| Tool | Command | Screenshots Needed |
|---|---|---|
| Burp Suite | Intercept POST → modify value → forward | Setup, modified request, 403 response |
| Nmap | `nmap -sV -p- 192.168.1.x` | Terminal, command, results |
| SQLMap | `sqlmap -u 'http://192.168.1.x:5000/api/login' --data='email=&password=' --level=3` | Running, command, not injectable |
| Nikto | `nikto -h http://192.168.1.x:5000` | Setup, command, headers report |
| Hydra | `hydra -l admin@ltsu.edu -P wordlist.txt 192.168.1.x http-post-form '/api/login:...'` | Setup, running, IP blocked |
| Wireshark | Filter: `http contains "Bearer"` | Capturing, request, token in packet |
| CyberChef | AES Decrypt recipe with QR secret key | Open, encrypted string, decrypted data |

---

## Final Checklist

### Code
- [ ] `npm run build` succeeds with no errors
- [ ] Flask API runs — all Thunder Client tests return 200
- [ ] Flutter APK built — `flutter build apk --release`
- [ ] All 8 roles tested with separate Clerk accounts
- [ ] Department isolation confirmed
- [ ] Website live on Vercel, Flask live on Railway

### Security
- [ ] 21 screenshots taken (3 per tool × 7 tools)
- [ ] All screenshots in report Section 14

### Deliverables
- [ ] report.docx — all sections complete
- [ ] presentation.pptx — 18 slides
- [ ] code.zip — nextjs_website/ + flask_api/ + flutter_app/
- [ ] app-release.apk
- [ ] Name and roll number on cover page

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| Module not found: @clerk/nextjs | Dependency missing | `npm install @clerk/nextjs` |
| python: not found | PATH not set | Reinstall Python and check Add to PATH |
| flutter: not found | PATH not configured | Add C:\flutter\bin to System PATH |
| Supabase RLS blocks all queries | JWT not passed | Pass Authorization header with Clerk JWT |
| Railway deploy fails | Missing Procfile | Ensure Procfile exists in flask_api/ root |
| Ollama out of memory | Model too large | `ollama pull moondream` (smaller model) |
| Clerk redirect loop | middleware.ts wrong | Add public routes to publicRoutes in middleware |
| CORS error | Flask missing CORS | `from flask_cors import CORS; CORS(app)` |
