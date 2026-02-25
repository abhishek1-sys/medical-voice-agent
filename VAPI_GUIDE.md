# 🎙️ Medical Voice Agent - Vapi.ai Integration Guide

## 🚀 What is Vapi.ai?

**Vapi.ai** एक powerful voice AI platform है जो:
- ✅ Real-time voice conversations handle करता है
- ✅ Automatic speech recognition (STT)
- ✅ Natural text-to-speech (TTS)
- ✅ Low latency (~500ms response time)
- ✅ Hindi + English support
- ✅ No complex audio handling needed

### Why Vapi Instead of Custom Solution?

| Feature | Custom (AssemblyAI + Gemini + Web Speech) | Vapi.ai |
|---------|-------------------------------------------|---------|
| Voice Recording | Manual MediaRecorder | Automatic |
| Speech-to-Text | AssemblyAI API calls | Built-in |
| Text-to-Speech | Browser Web Speech API | Professional voices |
| Latency | 3-5 seconds | <500ms |
| Setup Complexity | High | Low |
| Hindi Support | Limited | Excellent |
| Voice Quality | Browser-dependent | Consistent |
| **Developer Experience** | Complex | Simple |

---

## 📋 Quick Start

### Step 1: Create Vapi Account

1. जाएं: https://vapi.ai
2. "Start Building" click करें
3. Email से sign up करें (Free tier available!)
4. Dashboard open हो जाएगा

### Step 2: Get API Keys

#### Private API Key (Backend):
1. Dashboard → Settings → API Keys
2. "Create Private Key" click करें
3. Key copy करें → `.env.local` में `VAPI_API_KEY` के रूप में save करें
4. ⚠️ **Never share this key publicly!**

#### Public Key (Frontend):
1. Same API Keys page पर
2. "Public Key" section में जाएं
3. Copy करें → `.env.local` में `NEXT_PUBLIC_VAPI_PUBLIC_KEY` के रूप में save करें

Example `.env.local`:
```env
# Vapi Keys
VAPI_API_KEY="sk-vapi-abc123xyz456..."
NEXT_PUBLIC_VAPI_PUBLIC_KEY="pk-vapi-def789uvw012..."
```

### Step 3: Install Dependencies

```bash
npm install @vapi-ai/web
```

### Step 4: Run the App

```bash
npm run dev
```

Visit: http://localhost:3000

---

## 🎯 How It Works

### Architecture Flow:

```
User Clicks "Start Session"
        ↓
Fill Basic Details (Name, Age, Symptoms)
        ↓
AI Suggests Specialist
        ↓
Click "Start Voice Consultation"
        ↓
[Backend] Create Vapi Assistant with specialist context
        ↓
[Frontend] Vapi Component Loads
        ↓
User Clicks Microphone Button
        ↓
═══════════════════════════════════════
Vapi Handles Everything:
  - Captures user voice
  - Transcribes to text (STT)
  - Sends to AI (GPT-4)
  - AI generates response
  - Converts to speech (TTS)
  - Plays back to user
═══════════════════════════════════════
        ↓
Conversation continues automatically
        ↓
User ends call
        ↓
[Backend] Fetch transcript from Vapi
        ↓
[Backend] Analyze with Gemini
        ↓
Generate Medical Report
        ↓
Show to User
```

---

## 🔧 Technical Implementation

### 1. Backend - Create Assistant (API Route)

**File:** `/app/api/vapi/create-assistant/route.ts`

```typescript
// Creates a specialized medical assistant for each consultation
const assistant = await createMedicalAssistant(
  'cardiologist',
  'Cardiologist',
  'Rahul Kumar',
  'Chest pain and palpitations'
);
```

This creates a Vapi assistant with:
- Medical specialist personality
- Patient context (name, symptoms)
- Professional medical guidelines
- Hindi/English language support

### 2. Frontend - Voice Component

**File:** `/components/VapiVoiceConsultation.tsx`

```typescript
// Initialize Vapi client
const vapi = new Vapi(publicKey);

// Start call
vapi.start(assistantId);

// Vapi handles:
// - Microphone access
// - Voice recording
// - Real-time transcription
// - AI responses
// - Speech playback
```

### 3. Post-Call Analysis

**File:** `/app/api/vapi/analyze-conversation/route.ts`

```typescript
// After call ends:
1. Fetch full transcript from Vapi
2. Extract patient messages
3. Run medical analysis (Gemini)
4. Save to database
5. Generate report
```

---

## 💡 Key Features

### 1. **Real-Time Conversation**
- No button pressing after initial start
- Natural back-and-forth dialogue
- AI interruption handling

### 2. **Live Transcript**
- See conversation as it happens
- Patient messages on right (green)
- AI responses on left (blue)

### 3. **Visual Feedback**
- Volume level indicator
- Connection status
- Call duration timer
- Speaking/listening states

### 4. **Controls**
- Mute/Unmute button
- End call button
- Volume indicator

---

## 🎨 UI Components

### Main Call Button
```
┌─────────────────┐
│   🎤 or 📞     │  ← Click to start/end
└─────────────────┘
   [00:45]          ← Duration
   Connected        ← Status
```

### Live Transcript
```
┌──────────────────────────────┐
│ You: I have chest pain       │
├──────────────────────────────┤
│ Doctor: When did it start?   │
├──────────────────────────────┤
│ You: Two days ago            │
└──────────────────────────────┘
```

---

## 🔐 Security & Privacy

### Data Flow:
1. **User Voice** → Vapi Servers → Transcribed
2. **Transcript** → Your Backend → Saved in DB
3. **AI Response** → Vapi → Spoken Back

### Privacy:
- Vapi stores call recordings (if enabled)
- You control what gets saved in your database
- HIPAA compliance available on paid plans

---

## 💰 Pricing

### Free Tier:
- 10 minutes of voice calls per month
- Ideal for testing
- All features available

### Paid Plans:
- **Starter:** $0.05/minute
- **Pro:** $0.03/minute (+ additional features)
- **Enterprise:** Custom pricing

**For Medical App:** ~$3-15/month for 100-500 consultations

---

## 🐛 Troubleshooting

### Problem 1: "Vapi not initialized"
**Solution:**
```bash
# Check .env.local
echo $NEXT_PUBLIC_VAPI_PUBLIC_KEY
# Should print your public key

# Restart server
npm run dev
```

### Problem 2: "Failed to start call"
**Causes:**
- Invalid API key
- Microphone permission denied
- Assistant not created

**Fix:**
1. Verify API keys in Vapi dashboard
2. Check browser console (F12)
3. Allow microphone access

### Problem 3: "No audio output"
**Solution:**
- Check speaker volume
- Try different browser (Chrome recommended)
- Check Vapi dashboard for call logs

### Problem 4: Assistant creation fails
**Check:**
```javascript
// Console should show:
"Setting up your voice assistant..."
// Then:
"Connected"

// If stuck, check:
- VAPI_API_KEY in .env.local
- GEMINI_API_KEY for analysis
```

---

## 📊 Monitoring Calls

### Vapi Dashboard:
1. Login to vapi.ai
2. Go to "Calls" section
3. See all calls with:
   - Duration
   - Transcript
   - Cost
   - Recording (if enabled)

### Your Database:
- Full transcripts saved in `sessions` table
- Medical analysis in `reports` table
- Search/filter by patient name, date, specialist

---

## 🚀 Advanced Features

### Custom Voice Prompts:
```typescript
// In vapi.ts service file
firstMessage: `Namaste ${patientName}! Main aapka ${specialistName} hoon...`
```

### End Call Phrases:
```typescript
endCallPhrases: [
  'end call',
  'goodbye',
  'धन्यवाद',
  'बातचीत ख़त्म करो'
]
```

### Function Calling (Advanced):
Vapi can trigger functions during call:
```typescript
functions: [
  {
    name: 'scheduleFollowUp',
    description: 'Schedule a follow-up appointment',
    parameters: { date: 'string', time: 'string' }
  }
]
```

---

## ✅ Testing Checklist

Before going live:

- [ ] Vapi account created
- [ ] API keys added to `.env.local`
- [ ] `npm install` completed
- [ ] Server running (`npm run dev`)
- [ ] Can create new session
- [ ] Voice call starts successfully
- [ ] Can hear AI speaking
- [ ] AI can hear user
- [ ] Live transcript showing
- [ ] Call ends properly
- [ ] Report generates
- [ ] Transcript saved in database

---

## 🆚 Comparison: Before vs After

### Before (Custom Solution):
```javascript
// Complex voice handling
1. Request microphone permission
2. Start MediaRecorder
3. Collect audio chunks
4. Stop recording
5. Create audio blob
6. Send to AssemblyAI
7. Wait for transcription
8. Send to Gemini
9. Get response
10. Use Web Speech API for TTS
11. Handle errors at each step

Total: ~10 steps, ~5 seconds latency
```

### After (Vapi):
```javascript
// Simple integration
1. vapi.start(assistantId)
2. User speaks
3. AI responds automatically

Total: 1 step, ~500ms latency
```

---

## 🎓 Learning Resources

### Official Docs:
- https://docs.vapi.ai
- https://docs.vapi.ai/quickstart

### Video Tutorials:
- Vapi YouTube Channel
- Community tutorials

### Support:
- Discord: https://discord.gg/vapi
- Email: support@vapi.ai

---

## 🔄 Migration from Old System

If you had the old AssemblyAI + Web Speech system:

### What to Remove:
```bash
# These are no longer needed:
- /lib/services/assemblyai.ts (keep for backup)
- Old recording logic in new-session/page.tsx
- MediaRecorder code
- Web Speech API calls
```

### What to Keep:
```bash
# These are still used:
- /lib/services/gemini.ts (for medical analysis)
- Database queries
- Session management
- Report generation
```

---

## 💬 Sample Conversations

### English:
```
User: I've been having chest pain for two days
AI: I understand you're experiencing chest pain. On a scale of 1-10, 
    how would you rate the severity? And is it constant or comes and goes?

User: It's around 7 out of 10, and it comes and goes
AI: That's concerning. Are you also experiencing any shortness of breath,
    sweating, or pain radiating to your arm or jaw?
```

### Hindi:
```
User: Mujhe do din se seene mein dard ho raha hai
AI: Main samajhta hoon. Dard kitna tez hai, 1 se 10 mein batayein?
    Aur yeh lagatar hai ya kabhi kabhi hota hai?

User: Lagbhag 7, aur kabhi kabhi hota hai
AI: Yeh chinta ki baat hai. Kya aapko saans lene mein takleef,
    pasina, ya bazu/jaw mein dard bhi ho raha hai?
```

---

## 🎉 Success!

Agar sab kuch kaam kar raha hai:

✅ Microphone button click hota hai
✅ Voice call start hoti hai
✅ User bol sakta hai
✅ AI respond karta hai (voice mein)
✅ Live transcript dikhta hai
✅ Call end karne par report milti hai

**Congratulations! Aapka Vapi integration successful hai! 🚀**

---

## 📞 Need Help?

Check:
1. Browser console (F12) for errors
2. Vapi dashboard for call logs
3. Server terminal for backend errors
4. TESTING_GUIDE.md for common issues

**Happy Voice Calling! 🎤**
