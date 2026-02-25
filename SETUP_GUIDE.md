# 🇮🇳 Medical Voice Agent - Hindi Setup Guide

यह guide आपको step-by-step बताएगी कि कैसे project को setup करें और run करें।

---

## 📋 Table of Contents
1. [जरूरी चीजें](#जरूरी-चीजें)
2. [API Keys कैसे लें](#api-keys-कैसे-लें)
3. [Database Setup](#database-setup)
4. [Project Installation](#project-installation)
5. [Common Problems और Solutions](#common-problems-और-solutions)

---

## जरूरी चीजें

### 1. Node.js Install करें
- Website: https://nodejs.org/
- Version 18 या उससे ऊपर install करें
- Terminal में check करें:
```bash
node --version
# Output: v18.x.x या higher होना चाहिए
```

### 2. PostgreSQL Install करें
**Windows:**
- Download: https://www.postgresql.org/download/windows/
- Installer run करें
- Password set करें (याद रखें!)
- Port: 5432 (default रहने दें)

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## API Keys कैसे लें

### 1. Clerk (Authentication) 🔐

**Step 1:** https://clerk.com पर जाएं
**Step 2:** "Start Building for Free" click करें
**Step 3:** Email से sign up करें
**Step 4:** New Application बनाएं:
   - Application name: "Medical Voice Agent"
   - Sign-in methods: Email + Google (optional)

**Step 5:** API Keys copy करें:
   - Dashboard → API Keys section में जाएं
   - Copy करें:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with pk_test_)
     - `CLERK_SECRET_KEY` (starts with sk_test_)

---

### 2. AssemblyAI (Voice to Text) 🎤

**Step 1:** https://www.assemblyai.com पर जाएं
**Step 2:** "Get Started Free" click करें
**Step 3:** Email से sign up करें
**Step 4:** Dashboard पर जाएं
**Step 5:** API Key copy करें
   - Settings → API Keys
   - Copy `ASSEMBLYAI_API_KEY`

**Free Tier:**
- 5 hours/month free transcription
- Hindi और English दोनों support करता है

---

### 3. Google Gemini (AI) 🤖

**Step 1:** https://ai.google.dev पर जाएं
**Step 2:** "Get API Key" click करें
**Step 3:** Google account से login करें
**Step 4:** New project बनाएं
**Step 5:** API Key generate करें
**Step 6:** Copy करें `GEMINI_API_KEY`

**Free Tier:**
- 60 requests per minute
- Unlimited usage (with rate limits)

---

## Database Setup

### Step 1: PostgreSQL में Database बनाएं

**Option A: Using pgAdmin (Windows users)**
1. pgAdmin open करें
2. Right-click on "Databases"
3. Create → Database
4. Name: `medical_voice_db`
5. Save

**Option B: Using Terminal (Mac/Linux)**
```bash
# PostgreSQL में login करें
psql -U postgres

# Database बनाएं
CREATE DATABASE medical_voice_db;

# Check करें
\l

# Exit करें
\q
```

### Step 2: Connection String बनाएं

Format:
```
postgresql://username:password@localhost:5432/database_name
```

Example:
```
postgresql://postgres:mypassword123@localhost:5432/medical_voice_db
```

**Replace करें:**
- `postgres` → अपना PostgreSQL username
- `mypassword123` → अपना PostgreSQL password
- `medical_voice_db` → database name

---

## Project Installation

### Step 1: Project Download/Extract करें
```bash
cd /path/to/project/folder
```

### Step 2: Dependencies Install करें
```bash
npm install
```

यह थोड़ा time लेगा (2-5 minutes)। Wait करें जब तक:
```
added XXX packages
```
ना दिख जाए।

### Step 3: Environment Variables Setup

**`.env.local` file बनाएं** project के root folder में:

```bash
# Windows (Command Prompt)
type nul > .env.local

# Mac/Linux
touch .env.local
```

**File को open करें** और ये paste करें:

```env
# ════════════════════════════════════════════════════════
# DATABASE
# ════════════════════════════════════════════════════════
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/medical_voice_db"

# ════════════════════════════════════════════════════════
# CLERK AUTHENTICATION
# ════════════════════════════════════════════════════════
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"
CLERK_SECRET_KEY="sk_test_YOUR_KEY_HERE"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# ════════════════════════════════════════════════════════
# ASSEMBLYAI (Voice Transcription)
# ════════════════════════════════════════════════════════
ASSEMBLYAI_API_KEY="YOUR_ASSEMBLYAI_KEY_HERE"

# ════════════════════════════════════════════════════════
# GOOGLE GEMINI (AI)
# ════════════════════════════════════════════════════════
GEMINI_API_KEY="YOUR_GEMINI_KEY_HERE"
```

**⚠️ Important:**
- सभी `YOUR_KEY_HERE` को अपनी actual keys से replace करें
- Quotation marks (`"`) को remove ना करें
- Spaces add ना करें

### Step 4: Database Schema Setup

```bash
# Drizzle migrations generate करें
npm run db:generate

# Database में tables बनाएं
npm run db:push
```

**Success message:**
```
✓ Pushed schema to database
```

### Step 5: Development Server Start करें

```bash
npm run dev
```

**Success message:**
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### Step 6: Browser में Open करें

1. Browser open करें (Chrome recommended)
2. जाएं: http://localhost:3000
3. Sign up करें
4. Dashboard आ जाना चाहिए!

---

## Common Problems और Solutions

### ❌ Problem 1: `npm install` error
```
Error: Cannot find module...
```

**Solution:**
```bash
# Node modules delete करें
rm -rf node_modules package-lock.json

# फिर से install करें
npm install
```

---

### ❌ Problem 2: Database connection error
```
Error: connect ECONNREFUSED
```

**Solution:**
1. Check करें PostgreSQL running है:
```bash
# Mac/Linux
sudo systemctl status postgresql

# Windows: Services में देखें
```

2. Database URL check करें `.env.local` में:
   - Username सही है?
   - Password सही है?
   - Database name सही है?

---

### ❌ Problem 3: Port 3000 already in use
```
Error: Port 3000 is already in use
```

**Solution A: Different port use करें**
```bash
PORT=3001 npm run dev
```

**Solution B: Process kill करें**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

---

### ❌ Problem 4: Microphone not working
```
Microphone access denied
```

**Solution:**
1. Browser settings में जाएं
2. Privacy & Security → Site Settings → Microphone
3. localhost को "Allow" करें
4. Page refresh करें

**Chrome:**
- URL bar में lock icon click करें
- Microphone → Allow

---

### ❌ Problem 5: Clerk authentication error
```
Clerk: Missing publishableKey
```

**Solution:**
1. `.env.local` में check करें:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set है?
   - `CLERK_SECRET_KEY` set है?
2. Server restart करें:
   ```bash
   # Stop: Ctrl+C
   npm run dev
   ```

---

### ❌ Problem 6: Voice transcription not working
```
AssemblyAI API error
```

**Solution:**
1. Check करें `ASSEMBLYAI_API_KEY` सही है
2. AssemblyAI dashboard में credits check करें
3. Internet connection stable है?

---

### ❌ Problem 7: AI response not coming
```
Gemini API error
```

**Solution:**
1. Check करें `GEMINI_API_KEY` सही है
2. Google AI Studio में API key active है?
3. Rate limits cross नहीं हो गए?

---

## ✅ Final Checklist

Project run करने से पहले confirm करें:

- [ ] Node.js 18+ installed है
- [ ] PostgreSQL running है
- [ ] Database `medical_voice_db` बना है
- [ ] `npm install` successfully complete हुआ
- [ ] `.env.local` file बनी है
- [ ] सभी API keys correctly set हैं
- [ ] `npm run db:push` successfully run हुआ
- [ ] Browser में http://localhost:3000 open हो रहा है
- [ ] Sign up/Sign in काम कर रहा है
- [ ] Microphone permission granted है

---

## 🎯 Testing Instructions

### Test 1: Voice Recording
1. "Start New Session" click करें
2. Details fill करें
3. Specialist select करें
4. Microphone button click करें
5. Bolo: "मुझे बहुत तेज बुखार है"
6. Stop button click करें
7. AI response आना चाहिए (text और voice दोनों)

### Test 2: Two-Way Conversation
1. एक बार फिर record करें
2. Bolo: "बुखार कब से है? 3 दिन से"
3. AI आपको follow-up questions पूछेगा

### Test 3: End Consultation
1. 2-3 conversation turns करें
2. "End Consultation" button click करें
3. Medical report generate होगा
4. Report में symptoms, recommendations दिखेंगे

---

## 📞 Need Help?

### Check Logs:
```bash
# Browser console खोलें
F12 → Console tab

# Terminal में errors देखें
# जहां npm run dev चल रहा है
```

### Common Error Keywords:
- `ECONNREFUSED` → Database नहीं चल रहा
- `401 Unauthorized` → API key wrong है
- `CORS error` → Browser security issue
- `Module not found` → npm install फिर से करें

---

## 🚀 Success!

अगर सब कुछ काम कर रहा है तो:

1. ✅ Dashboard दिख रहा है
2. ✅ Voice recording हो रहा है
3. ✅ AI response आ रहा है (text + voice)
4. ✅ Reports generate हो रहे हैं

**Congratulations! 🎉**

अब आप medical voice consultations ले सकते हैं!

---

**Tips:**
- Hindi और English दोनों languages में बोल सकते हैं
- Clear और loud बोलें for better transcription
- Quiet environment में record करें
- हर consultation automatically save होती है

**All the best! 💪**
