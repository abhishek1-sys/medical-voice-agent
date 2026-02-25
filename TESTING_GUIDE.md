# 🔍 Quick Reference & Testing Guide

## Voice Recording Flow - Step by Step

### User Action Flow:
```
1. Click Mic Button
   ↓
2. Browser asks for permission
   ↓
3. Allow microphone
   ↓
4. Recording starts (red button + timer shows)
   ↓
5. Speak your symptoms
   ↓
6. Click Stop button
   ↓
7. Processing starts (loading spinner)
   ↓
8. Transcription happens (AssemblyAI)
   ↓
9. AI generates response (Gemini)
   ↓
10. AI speaks back (Web Speech API)
    ↓
11. Conversation history updates
```

---

## Console Debug Commands

### Check if APIs are working:

```javascript
// In Browser Console (F12)

// Test 1: Check environment variables loaded
console.log('Clerk Key exists:', !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// Test 2: Check microphone access
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('✅ Microphone access granted'))
  .catch(err => console.error('❌ Microphone error:', err));

// Test 3: Check Web Speech API
if ('speechSynthesis' in window) {
  console.log('✅ Text-to-Speech available');
  const voices = speechSynthesis.getVoices();
  console.log('Available voices:', voices.length);
} else {
  console.log('❌ Text-to-Speech not available');
}

// Test 4: Test TTS
const utterance = new SpeechSynthesisUtterance('Testing voice output');
utterance.lang = 'hi-IN';
speechSynthesis.speak(utterance);
```

---

## API Testing (Using cURL or Postman)

### Test Voice Conversation API:
```bash
curl -X POST http://localhost:3000/api/voice-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I have fever and headache",
    "conversationHistory": [],
    "context": {
      "name": "Test Patient",
      "symptoms": "Fever",
      "specialist": "General Physician"
    }
  }'
```

Expected Response:
```json
{
  "success": true,
  "response": "I understand you're experiencing fever and headache..."
}
```

---

## Common Error Messages & Fixes

### 1. "Microphone access denied"
**Cause:** Browser permission not granted
**Fix:**
```javascript
// Check permission status
navigator.permissions.query({ name: 'microphone' })
  .then(result => console.log('Microphone permission:', result.state));
```
- Chrome: Click lock icon → Microphone → Allow
- Firefox: Click i icon → Permissions → Microphone → Allow

---

### 2. "No audio was recorded"
**Cause:** MediaRecorder failed to capture audio
**Debug:**
```javascript
// Check MediaRecorder support
console.log('MediaRecorder supported:', 'MediaRecorder' in window);
console.log('Supported MIME types:', [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus'
].map(type => ({ type, supported: MediaRecorder.isTypeSupported(type) })));
```

---

### 3. "Failed to process audio"
**Possible Causes:**
1. AssemblyAI API key invalid
2. Audio file too short (<1 second)
3. Network error

**Debug:**
```javascript
// Check audio blob size
console.log('Audio blob size:', blob.size, 'bytes');
// Should be > 1000 bytes for ~1 second of audio
```

---

### 4. "AI response not speaking"
**Causes:**
- Browser blocked autoplay
- speechSynthesis not initialized
- No voices loaded

**Fix:**
```javascript
// Load voices manually
window.speechSynthesis.getVoices();

// Wait for voices to load
speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  console.log('Voices loaded:', voices.length);
};

// Test speaking
const test = new SpeechSynthesisUtterance('Test');
test.lang = 'hi-IN';
speechSynthesis.speak(test);
```

---

## Environment Variables Checklist

```bash
# Run this in terminal to check if all vars are set
echo "Checking environment variables..."

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "✅ .env.local file exists"
else
    echo "❌ .env.local file missing!"
fi

# Check each required variable (manual check needed)
# Open .env.local and verify:
```

Required variables:
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Starts with pk_test_
- [ ] `CLERK_SECRET_KEY` - Starts with sk_test_
- [ ] `ASSEMBLYAI_API_KEY` - AssemblyAI key
- [ ] `GEMINI_API_KEY` - Google Gemini key

---

## Database Quick Checks

### Check if tables exist:
```sql
-- Connect to database
psql -U postgres -d medical_voice_db

-- List all tables
\dt

-- Expected output:
-- sessions
-- reports

-- Check sessions table structure
\d sessions

-- Check if any data exists
SELECT COUNT(*) FROM sessions;
SELECT COUNT(*) FROM reports;

-- Exit
\q
```

---

## Performance Benchmarks

### Expected Timings:
- **Recording start:** < 1 second
- **Recording stop → Processing start:** < 0.5 seconds
- **Transcription (10 seconds audio):** 2-5 seconds
- **AI response generation:** 1-3 seconds
- **TTS playback:** Immediate

### If slower:
- Check internet speed
- Verify API rate limits
- Check server logs for bottlenecks

---

## Browser Compatibility Check

```javascript
// Run in browser console
const features = {
  'getUserMedia': 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
  'MediaRecorder': 'MediaRecorder' in window,
  'SpeechSynthesis': 'speechSynthesis' in window,
  'Fetch API': 'fetch' in window,
  'Promises': 'Promise' in window,
  'LocalStorage': 'localStorage' in window
};

console.table(features);

// All should be true
```

---

## Voice Quality Settings

### Optimal Recording Settings:
```typescript
const audioConstraints = {
  audio: {
    echoCancellation: true,      // Remove echo
    noiseSuppression: true,       // Remove background noise
    autoGainControl: true,        // Normalize volume
    sampleRate: 44100            // CD quality
  }
};
```

### TTS Settings for Best Output:
```typescript
utterance.rate = 0.95;    // Slightly slower for clarity
utterance.pitch = 1.0;    // Normal pitch
utterance.volume = 1.0;   // Maximum volume
```

---

## Testing Workflow

### Manual Test Script:
```bash
# 1. Start fresh
npm run dev

# 2. Open browser
# 3. Open DevTools (F12)
# 4. Go to Console tab

# 5. Test sequence:
# - Sign in
# - Start new session
# - Fill details
# - Record voice
# - Check console for logs
# - Verify AI response (text + voice)
# - End consultation
# - Check report generated

# 6. Check database
# psql -U postgres -d medical_voice_db
# SELECT * FROM sessions ORDER BY "createdAt" DESC LIMIT 1;
```

---

## Sample Test Phrases

### English:
- "I have a high fever for the last three days"
- "I'm experiencing chest pain and difficulty breathing"
- "My head hurts and I feel dizzy"

### Hindi:
- "मुझे तीन दिन से बहुत तेज बुखार है"
- "मेरे सीने में दर्द है और सांस लेने में तकलीफ हो रही है"
- "मेरे सिर में दर्द है और चक्कर आ रहे हैं"

### Hinglish:
- "Mujhe bahut tej fever hai aur cough bhi ho raha hai"
- "Stomach mein pain hai aur vomiting feel ho raha hai"

---

## Monitoring & Logs

### Important Log Points:
```javascript
// In new-session/page.tsx

console.log('Recording started');           // Line ~207
console.log('Audio chunk received');        // Line ~198
console.log('Recording stopped');           // Line ~210
console.log('Processing voice blob');       // Line ~220
console.log('User said:', transcript);      // Line ~235
console.log('AI response:', aiResponse);    // Line ~253
console.log('Speaking AI response');        // Line ~258
```

### Watch these in browser console during testing!

---

## Quick Fixes

### Fix 1: Clear all state and restart
```bash
# Stop server: Ctrl+C
# Clear node modules
rm -rf node_modules .next
# Reinstall
npm install
# Restart
npm run dev
```

### Fix 2: Reset database
```bash
# WARNING: This deletes all data!
npm run db:push
```

### Fix 3: Clear browser cache
```
Chrome: Ctrl+Shift+Delete → Clear browsing data
Firefox: Ctrl+Shift+Delete → Clear recent history
```

---

## Success Indicators

### ✅ Everything Working:
- Console shows: "Recording started successfully"
- Red button animates during recording
- Timer counts up (0:01, 0:02...)
- Console shows: "Audio chunk received" multiple times
- After stop: "Processing voice blob" appears
- Transcription appears in console
- AI response appears in chat
- AI voice plays automatically
- No error messages in console

### ❌ Something Wrong:
- Permission errors
- "No audio was recorded"
- Network errors (check API keys)
- "Failed to process audio"
- No AI voice output

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All API keys added to Vercel/hosting provider
- [ ] DATABASE_URL points to production database
- [ ] Clerk production keys configured
- [ ] CORS settings configured if needed
- [ ] HTTPS enabled (required for microphone)
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Monitor API usage/costs
- [ ] Set up error logging (Sentry, etc.)
- [ ] Database backups configured

---

**Happy Testing! 🧪**
