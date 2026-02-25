# 🏥 Medical Voice Agent - Complete Fixed Version

**AI-Powered Medical Voice Consultation Platform**

यह एक complete medical voice consultation platform है जो voice recording, real-time transcription, AI specialist consultation, और detailed medical reports provide करता है।

---

## ✨ Features / विशेषताएं

### ✅ Working Features:
1. **🎤 Voice Recording** - High-quality audio recording with real-time duration display
2. **🗣️ Two-Way Conversation** - AI specialist responds in voice (Hindi/English support)
3. **🤖 Smart Specialist Selection** - AI-powered specialist recommendation
4. **📊 Medical Analysis** - Comprehensive medical report generation
5. **💾 Session Management** - Save and track all consultations
6. **🔒 Secure Authentication** - Clerk-based user authentication
7. **📱 Responsive Design** - Works on desktop and mobile

---

## 🛠️ Technologies Used

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Voice Processing**: AssemblyAI (Speech-to-Text)
- **AI**: Google Gemini 1.5 Flash
- **Authentication**: Clerk
- **Text-to-Speech**: Browser Web Speech API

---

## 🚀 Quick Start Guide

### Prerequisites / पहले से चाहिए:
- Node.js 18+ installed
- PostgreSQL database
- API Keys for:
  - Clerk (https://clerk.com)
  - AssemblyAI (https://www.assemblyai.com)
  - Google Gemini (https://ai.google.dev)

### Installation Steps:

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment Variables
`.env.local` file बनाएं और ये values add करें:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/medical_voice_db"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxx"
CLERK_SECRET_KEY="sk_test_xxxxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# AssemblyAI (Voice Transcription)
ASSEMBLYAI_API_KEY="your_assemblyai_api_key"

# Google Gemini (AI Analysis)
GEMINI_API_KEY="your_gemini_api_key"
```

#### 3. Setup Database
```bash
# Generate Drizzle migration files
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Drizzle Studio to view database
npm run db:studio
```

#### 4. Run Development Server
```bash
npm run dev
```

App will open at: **http://localhost:3000**

---

## 📋 How to Use / कैसे इस्तेमाल करें

### Step-by-Step Usage:

1. **Sign Up/Sign In** 
   - Create account या existing account से login करें

2. **Start New Session**
   - Dashboard पर "Start New Session" button click करें

3. **Basic Details (Step 1)**
   - Patient का name, age, gender enter करें

4. **Symptoms (Step 2)**
   - Symptoms aur duration detail में लिखें

5. **Additional Info (Step 3)**
   - Medical history aur extra details add करें

6. **Choose Specialist (Step 4)**
   - AI automatically best specialist suggest करेगा
   - आप manually भी select कर सकते हैं

7. **Voice Consultation (Step 5)**
   - 🎤 **Microphone button click करें**
   - अपनी medical problem बोलें (Hindi/English)
   - **Stop button click करें** recording end करने के लिए
   - AI specialist आपको voice में response देगा
   - जितनी बार चाहें conversation continue करें
   - **"End Consultation"** click करें report generate करने के लिए

---

## 🎯 Key Improvements in This Version

### 1. **Enhanced Voice Recording**
```typescript
✅ Microphone permission handling
✅ Real-time duration display
✅ Better error messages
✅ Audio quality improvements (echo cancellation, noise suppression)
✅ Visual feedback during recording
```

### 2. **Two-Way Conversation**
```typescript
✅ AI responds in voice automatically
✅ Hindi/English language detection
✅ Natural conversation flow
✅ Context-aware responses
```

### 3. **Better Error Handling**
```typescript
✅ Clear error messages in UI
✅ Microphone permission errors
✅ Network error handling
✅ Fallback responses
```

### 4. **Improved UX**
```typescript
✅ Loading states for all operations
✅ Visual recording indicators
✅ Duration counter
✅ Success/error notifications
```

---

## 🔧 Troubleshooting / समस्या समाधान

### Problem: Microphone not working
**Solution:**
- Browser settings में microphone permission check करें
- HTTPS पर run करें (या localhost)
- Different browser try करें (Chrome recommended)

### Problem: Voice response नहीं आ रहा
**Solution:**
- Browser में speaker volume check करें
- Console में errors देखें
- GEMINI_API_KEY सही से set है check करें

### Problem: Database connection error
**Solution:**
- PostgreSQL running है check करें
- DATABASE_URL सही है verify करें
- `npm run db:push` फिर से run करें

### Problem: "End Consultation" button काम नहीं कर रहा
**Solution:**
- पहले कम से कम एक conversation turn complete करें
- Console में errors check करें
- Page refresh करके retry करें

---

## 📊 Database Schema

```sql
-- sessions table
- id: string (primary key)
- userId: string
- patientName: string
- age: integer
- gender: string
- symptoms: text
- currentStep: integer
- chosenSpecialist: string
- transcript: text
- aiResponse: text
- createdAt: timestamp

-- reports table
- id: string (primary key)
- sessionId: string (foreign key)
- userId: string
- title: string
- summary: text
- symptoms: json
- recommendations: json
- diagnosis: text
- specialist: string
- confidence: integer
- createdAt: timestamp
```

---

## 🎨 UI Components

### Main Components:
1. **VoiceRecorder** - Voice recording with visual feedback
2. **SessionCard** - Session history display
3. **StepProgress** - Multi-step form navigation
4. **ConversationDisplay** - Chat-style conversation UI

---

## 🔐 Security Features

- ✅ Clerk-based authentication
- ✅ Protected API routes
- ✅ User-specific data isolation
- ✅ Secure environment variables
- ✅ Input validation

---

## 📱 Browser Support

**Recommended:**
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

**Required Features:**
- MediaRecorder API
- Web Speech API (for TTS)
- getUserMedia API

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables
Deployment पर सभी environment variables add करना ना भूलें:
- DATABASE_URL
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- ASSEMBLYAI_API_KEY
- GEMINI_API_KEY

---

## 📝 API Endpoints

### POST `/api/sessions`
Create new session

### PATCH `/api/sessions`
Update session data

### POST `/api/process-audio`
Process voice recording and transcribe

### POST `/api/voice-conversation`
Get AI conversational response

### POST `/api/suggest-specialist`
Get AI specialist recommendation

---

## 🤝 Support

Issues होने पर:
1. Console errors check करें
2. All environment variables सही हैं verify करें
3. Database connection working है test करें
4. Browser microphone permissions check करें

---

## 📄 License

MIT License - Free to use and modify

---

## 🎉 Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env.local`)
- [ ] Database setup complete (`npm run db:push`)
- [ ] Development server running (`npm run dev`)
- [ ] Clerk authentication working
- [ ] Microphone permission granted
- [ ] Voice recording working
- [ ] AI responses coming through
- [ ] Reports generating successfully

---

**Happy Coding! 🚀**

For questions or issues, check the console logs for detailed error messages.
