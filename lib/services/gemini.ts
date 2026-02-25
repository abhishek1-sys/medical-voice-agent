// Gemini AI service — Full medical analysis + summarize

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash';

export const SPECIALISTS = [
  { id: 'general',            name: 'General Physician',     icon: '🩺', description: 'Primary care and general health issues' },
  { id: 'cardiologist',       name: 'Cardiologist',          icon: '❤️', description: 'Heart and cardiovascular issues' },
  { id: 'neurologist',        name: 'Neurologist',           icon: '🧠', description: 'Brain and nervous system issues' },
  { id: 'orthopedic',         name: 'Orthopedic',            icon: '🦴', description: 'Bones, joints and muscles' },
  { id: 'dermatologist',      name: 'Dermatologist',         icon: '🔬', description: 'Skin, hair and nails' },
  { id: 'gastroenterologist', name: 'Gastroenterologist',    icon: '🫁', description: 'Digestive system issues' },
  { id: 'pulmonologist',      name: 'Pulmonologist',         icon: '🫀', description: 'Lungs and respiratory issues' },
  { id: 'psychiatrist',       name: 'Psychiatrist',          icon: '🧘', description: 'Mental health and behavioral issues' },
];

export interface SpecialistSuggestion {
  specialistId: string; specialistName: string; reason: string;
  urgency: 'low' | 'medium' | 'high'; alternativeSpecialists: string[];
}
export interface SymptomSeverity { name: string; severity: number; trend: 'improving' | 'stable' | 'worsening'; }
export interface RecoveryTimeline { minDays: number; maxDays: number; label: string; milestones: { day: number; description: string }[]; }
export interface RiskFactor { name: string; level: number; category: 'lifestyle' | 'genetic' | 'environmental' | 'medical'; }
export interface DiseaseProgressionPoint { week: number; withTreatment: number; withoutTreatment: number; }

export interface MedicalAnalysis {
  summary: string; symptoms: string[]; recommendations: string[];
  diagnosis: string; confidence: number; urgency: 'low' | 'medium' | 'high'; disclaimer: string;
  diseaseLevel: number; painLevel: number; overallRisk: number;
  symptomSeverities: SymptomSeverity[]; riskFactors: RiskFactor[];
  recoveryTimeline: RecoveryTimeline; diseaseProgression: DiseaseProgressionPoint[];
  vitalIndicators: { name: string; value: string; status: 'normal' | 'warning' | 'critical' }[];
  treatmentPriority: 'immediate' | 'within_week' | 'within_month' | 'routine';
  followUpRecommendation: string; lifestyleChanges: string[]; medicationHints: string[];
}

async function callGemini(prompt: string, maxTokens = 2048, retries = 3): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured. Add GEMINI_API_KEY to .env.local');
  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });
      
      if (res.status === 429 || res.status === 503) {
        // Rate limited — wait and retry
        const wait = attempt * 2000;
        console.warn(`Gemini ${res.status} on attempt ${attempt}/${retries}, retrying in ${wait}ms…`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e?.error?.message || JSON.stringify(e);
        throw new Error(`Gemini API ${res.status}: ${msg}`);
      }
      
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      
      // Check for safety block
      if (!text && data?.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Gemini response blocked by safety filters');
      }
      
      if (!text) {
        console.warn('Gemini returned empty text. Full response:', JSON.stringify(data).slice(0, 500));
        throw new Error('Gemini returned empty response');
      }
      
      return text;
    } catch (err: any) {
      if (attempt === retries) throw err;
      if (err.message?.includes('GEMINI_API_KEY') || err.message?.includes('401')) throw err;
      // Transient error — retry
      await new Promise(r => setTimeout(r, attempt * 1500));
    }
  }
  throw new Error('Gemini: all retries exhausted');
}

function parseGeminiJSON<T>(raw: string): T {
  // Step 1: strip markdown code fences
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // Step 2: find the first { and last } to extract just the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  
  // Step 3: fix common Gemini JSON issues
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    // Step 4: last resort - try to extract with a more aggressive approach
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const extracted = match[0].replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(extracted) as T;
    }
    throw e;
  }
}

function ruleBasedSpecialist(symptoms: string): SpecialistSuggestion {
  const s = symptoms.toLowerCase();
  let id = 'general', name = 'General Physician', reason = 'A general physician can assess your symptoms.';
  if (s.match(/heart|chest pain|palpitation|blood pressure|cardiac/)) { id = 'cardiologist'; name = 'Cardiologist'; reason = 'Possible cardiac issue.'; }
  else if (s.match(/headache|migraine|seizure|numbness|memory|brain|nerve|dizz/)) { id = 'neurologist'; name = 'Neurologist'; reason = 'Possible nervous system issue.'; }
  else if (s.match(/joint|bone|fracture|knee|back pain|spine|muscle|ortho/)) { id = 'orthopedic'; name = 'Orthopedic'; reason = 'Possible musculoskeletal issue.'; }
  else if (s.match(/skin|rash|acne|itching|eczema|psoriasis|hair|nail/)) { id = 'dermatologist'; name = 'Dermatologist'; reason = 'Skin-related symptoms.'; }
  else if (s.match(/stomach|abdomen|nausea|vomiting|diarrhea|constipation|digest/)) { id = 'gastroenterologist'; name = 'Gastroenterologist'; reason = 'Digestive issue.'; }
  else if (s.match(/cough|breathing|lung|asthma|wheez|respiratory/)) { id = 'pulmonologist'; name = 'Pulmonologist'; reason = 'Respiratory issue.'; }
  else if (s.match(/anxiety|depression|stress|mental|sleep|mood|panic/)) { id = 'psychiatrist'; name = 'Psychiatrist'; reason = 'Mental health support needed.'; }
  return { specialistId: id, specialistName: name, reason, urgency: 'medium', alternativeSpecialists: ['general'] };
}

export async function suggestSpecialist(symptoms: string, additionalDetails: string): Promise<SpecialistSuggestion> {
  if (!GEMINI_API_KEY) return ruleBasedSpecialist(symptoms);
  const list = SPECIALISTS.map(s => `${s.id}: ${s.name} (${s.description})`).join('\n');
  const prompt = `Medical triage AI. Suggest specialist.\nSpecialists:\n${list}\nSymptoms: ${symptoms}\nDetails: ${additionalDetails || 'None'}\nJSON only:\n{"specialistId":"general","specialistName":"General Physician","reason":"reason","urgency":"medium","alternativeSpecialists":["cardiologist"]}`;
  try { const r = await callGemini(prompt, 512); const p = parseGeminiJSON<SpecialistSuggestion>(r); if (!p.specialistId) return ruleBasedSpecialist(symptoms); return p; }
  catch { return ruleBasedSpecialist(symptoms); }
}

export async function analyzeMedicalTranscript(
  transcript: string,
  context?: { name?: string; symptoms?: string; specialist?: string }
): Promise<MedicalAnalysis> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

  const prompt = `You are an expert medical AI. Analyze this consultation transcript. Generate a COMPLETE, DETAILED medical report with real quantitative data for all chart fields.

Patient: ${context?.name || 'Unknown'}
Specialist: ${context?.specialist || 'General Physician'}
Initial symptoms: ${context?.symptoms || 'Not provided'}

TRANSCRIPT:
${transcript}

IMPORTANT: Base all numeric values (diseaseLevel, painLevel, overallRisk, severity %, riskFactor levels) on actual content of the transcript. Be realistic and medically accurate.

Return ONLY valid JSON:
{
  "summary": "3-4 sentence detailed clinical summary of the consultation",
  "symptoms": ["list", "each", "symptom", "mentioned"],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2", "Specific recommendation 3"],
  "diagnosis": "Detailed differential diagnoses with reasoning. NOT a confirmed diagnosis.",
  "confidence": 75,
  "urgency": "medium",
  "disclaimer": "This AI analysis is for informational purposes only and does not replace professional medical advice.",
  "diseaseLevel": 55,
  "painLevel": 6,
  "overallRisk": 42,
  "symptomSeverities": [
    {"name": "Primary Symptom", "severity": 70, "trend": "stable"},
    {"name": "Secondary Symptom", "severity": 45, "trend": "improving"}
  ],
  "riskFactors": [
    {"name": "Lifestyle Factors", "level": 45, "category": "lifestyle"},
    {"name": "Medical History", "level": 30, "category": "medical"},
    {"name": "Environmental Exposure", "level": 20, "category": "environmental"},
    {"name": "Genetic Predisposition", "level": 15, "category": "genetic"}
  ],
  "recoveryTimeline": {
    "minDays": 7,
    "maxDays": 21,
    "label": "1-3 weeks",
    "milestones": [
      {"day": 3, "description": "Initial symptom relief with treatment"},
      {"day": 7, "description": "Significant improvement expected"},
      {"day": 14, "description": "Near-complete recovery"},
      {"day": 21, "description": "Full resolution anticipated"}
    ]
  },
  "diseaseProgression": [
    {"week": 0, "withTreatment": 45, "withoutTreatment": 45},
    {"week": 1, "withTreatment": 60, "withoutTreatment": 38},
    {"week": 2, "withTreatment": 75, "withoutTreatment": 30},
    {"week": 3, "withTreatment": 85, "withoutTreatment": 24},
    {"week": 4, "withTreatment": 93, "withoutTreatment": 18}
  ],
  "vitalIndicators": [
    {"name": "Inflammation", "value": "Moderate", "status": "warning"},
    {"name": "Immune Response", "value": "Elevated", "status": "warning"},
    {"name": "Hydration", "value": "Adequate", "status": "normal"},
    {"name": "Stress Level", "value": "Mild", "status": "normal"}
  ],
  "treatmentPriority": "within_week",
  "followUpRecommendation": "Schedule a follow-up appointment within 7-10 days to assess treatment response and adjust plan if needed.",
  "lifestyleChanges": ["Get adequate rest (7-8 hours sleep)", "Maintain hydration (8+ glasses water daily)", "Avoid known triggers"],
  "medicationHints": ["Over-the-counter analgesics may provide relief", "Consult doctor before starting any medication"]
}`;

  try {
    const raw = await callGemini(prompt, 4096);
    const a = parseGeminiJSON<MedicalAnalysis>(raw);
    return {
      summary:              a.summary              || 'No summary available',
      symptoms:             a.symptoms             || [],
      recommendations:      a.recommendations      || [],
      diagnosis:            a.diagnosis            || 'Unable to determine',
      confidence:           a.confidence           || 50,
      urgency:              a.urgency              || 'medium',
      disclaimer:           a.disclaimer           || 'This is not medical advice. Consult a doctor.',
      diseaseLevel:         a.diseaseLevel         ?? 50,
      painLevel:            a.painLevel            ?? 5,
      overallRisk:          a.overallRisk          ?? 40,
      symptomSeverities:    a.symptomSeverities    || [],
      riskFactors:          a.riskFactors          || [],
      recoveryTimeline:     a.recoveryTimeline     || { minDays: 7, maxDays: 30, label: '1-4 weeks', milestones: [] },
      diseaseProgression:   a.diseaseProgression   || [],
      vitalIndicators:      a.vitalIndicators      || [],
      treatmentPriority:    a.treatmentPriority    || 'within_week',
      followUpRecommendation: a.followUpRecommendation || 'Schedule a follow-up with your doctor',
      lifestyleChanges:     a.lifestyleChanges     || [],
      medicationHints:      a.medicationHints      || [],
    };
  } catch (err: any) { console.error('analyzeMedicalTranscript error:', err?.message || err); throw new Error(`Gemini analysis failed: ${err?.message || 'Unknown error'}`); }
}

// ── NEW: Summarize existing analysis into short plain text ──────────────────
export async function summarizeAnalysis(analysis: MedicalAnalysis, patientName: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    // Fallback: manual summary from data
    return `${patientName} presented with ${analysis.symptoms.slice(0, 3).join(', ')}. ` +
      `Disease severity is ${analysis.diseaseLevel}/100 with an overall risk score of ${analysis.overallRisk}/100. ` +
      `Expected recovery: ${analysis.recoveryTimeline.label}. ` +
      `Priority: ${analysis.treatmentPriority.replace(/_/g, ' ')}. ` +
      `${analysis.recommendations[0] || ''}`;
  }

  const prompt = `You are a medical AI. Summarize this medical report into 3-4 clear, simple sentences that a patient can understand. No jargon. Focus on: what is wrong, how serious it is, how long to recover, and what to do next.

Patient: ${patientName}
Diagnosis: ${analysis.diagnosis}
Disease Level: ${analysis.diseaseLevel}/100
Risk: ${analysis.overallRisk}/100
Recovery: ${analysis.recoveryTimeline.label}
Urgency: ${analysis.urgency}
Top recommendation: ${analysis.recommendations[0] || 'Consult a doctor'}

Write a concise 3-4 sentence patient-friendly summary. No bullet points, just plain text:`;

  try {
    const text = await callGemini(prompt, 512);
    return text.trim();
  } catch {
    return analysis.summary;
  }
}

export async function generateConversationResponse(
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  context: { name?: string; symptoms?: string; specialist?: string }
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const historyText = conversationHistory.map(m => `${m.role === 'user' ? 'Patient' : 'AI Doctor'}: ${m.content}`).join('\n');
  const prompt = `You are a ${context.specialist || 'medical'} AI assistant consulting with ${context.name || 'a patient'}.\nSymptoms: ${context.symptoms || 'Not provided'}.\nBe empathetic, professional. Max 2-3 sentences. Never give definitive diagnosis.\n\n${historyText ? `History:\n${historyText}\n` : ''}Patient: ${userMessage}\n\nYour response:`;
  try { return (await callGemini(prompt, 300)).trim() || 'Could you tell me more about your symptoms?'; }
  catch { return 'Could you please repeat that?'; }
}
