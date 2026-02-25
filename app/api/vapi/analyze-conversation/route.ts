import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeMedicalTranscript } from '@/lib/services/gemini';
import { extractMedicalDataFromTranscript } from '@/lib/services/vapi';
import { updateSession, createReport } from '@/lib/db/queries';

// Fallback analysis when Gemini fails — uses rule-based logic from transcript/symptoms
function buildFallbackAnalysis(transcript: string, patientName: string, symptoms: string, specialist: string): any {
  const s = (symptoms || transcript || '').toLowerCase();
  
  // Simple severity estimation from keywords
  const highKeywords = ['severe', 'intense', 'unbearable', 'emergency', 'chest pain', 'breathing', 'unconscious'];
  const medKeywords = ['moderate', 'worsening', 'fever', 'pain', 'nausea', 'vomiting', 'headache'];
  
  const isHigh = highKeywords.some(k => s.includes(k));
  const isMed = medKeywords.some(k => s.includes(k));
  const diseaseLevel = isHigh ? 72 : isMed ? 52 : 35;
  const urgency = isHigh ? 'high' : isMed ? 'medium' : 'low';
  const priority = isHigh ? 'immediate' : isMed ? 'within_week' : 'routine';

  // Extract symptoms from text
  const symptomKeywords = ['headache', 'fever', 'cough', 'pain', 'nausea', 'fatigue', 'dizziness', 'vomiting', 'rash', 'swelling', 'breathing difficulty', 'chest pain'];
  const foundSymptoms = symptomKeywords.filter(k => s.includes(k));
  const symptomList = foundSymptoms.length > 0 ? foundSymptoms.map(s => s.charAt(0).toUpperCase() + s.slice(1)) : (symptoms ? [symptoms] : ['Symptoms as described']);

  return {
    summary: `${patientName || 'Patient'} presented with ${symptoms || 'the described symptoms'}. A thorough evaluation was conducted with an AI ${specialist || 'General Physician'}. Note: This is a fallback analysis — please re-analyze for full AI insights.`,
    symptoms: symptomList,
    recommendations: [
      `Consult a qualified ${specialist || 'physician'} in person for proper diagnosis`,
      'Monitor symptoms and seek immediate care if they worsen',
      'Keep a log of symptom frequency, duration, and severity',
      'Stay hydrated and get adequate rest',
      'Avoid self-medicating without professional guidance',
    ],
    diagnosis: `Based on the reported symptoms, differential diagnoses may include conditions related to ${symptoms || 'the described complaints'}. A proper clinical examination is required for accurate diagnosis.`,
    confidence: 40,
    urgency,
    disclaimer: 'This is a fallback AI analysis due to a temporary processing issue. It is for informational purposes only and does NOT replace professional medical advice.',
    diseaseLevel,
    painLevel: isHigh ? 7 : isMed ? 5 : 3,
    overallRisk: isHigh ? 65 : isMed ? 42 : 25,
    symptomSeverities: symptomList.slice(0, 4).map((sym, i) => ({
      name: sym,
      severity: Math.max(30, diseaseLevel - i * 8),
      trend: i === 0 ? 'stable' : 'improving',
    })),
    riskFactors: [
      { name: 'Current Symptoms', level: diseaseLevel, category: 'medical' },
      { name: 'Lifestyle Factors', level: 35, category: 'lifestyle' },
      { name: 'Environmental', level: 20, category: 'environmental' },
      { name: 'Genetic', level: 15, category: 'genetic' },
    ],
    recoveryTimeline: {
      minDays: isHigh ? 7 : 3,
      maxDays: isHigh ? 30 : 14,
      label: isHigh ? '1–4 weeks' : '3–14 days',
      milestones: [
        { day: 2, description: 'Initial treatment response' },
        { day: 5, description: 'Symptom improvement expected' },
        { day: 10, description: 'Near-full recovery' },
      ],
    },
    diseaseProgression: [
      { week: 0, withTreatment: diseaseLevel - 15, withoutTreatment: diseaseLevel - 15 },
      { week: 1, withTreatment: diseaseLevel + 10, withoutTreatment: diseaseLevel - 20 },
      { week: 2, withTreatment: diseaseLevel + 25, withoutTreatment: diseaseLevel - 30 },
      { week: 3, withTreatment: diseaseLevel + 35, withoutTreatment: diseaseLevel - 38 },
      { week: 4, withTreatment: diseaseLevel + 42, withoutTreatment: diseaseLevel - 45 },
    ],
    vitalIndicators: [
      { name: 'Overall Status', value: isHigh ? 'Needs Attention' : 'Stable', status: isHigh ? 'warning' : 'normal' },
      { name: 'Symptom Severity', value: urgency === 'high' ? 'High' : urgency === 'medium' ? 'Moderate' : 'Mild', status: urgency === 'high' ? 'critical' : urgency === 'medium' ? 'warning' : 'normal' },
      { name: 'Care Urgency', value: priority.replace(/_/g, ' '), status: isHigh ? 'critical' : 'warning' },
      { name: 'Follow-up', value: 'Recommended', status: 'normal' },
    ],
    treatmentPriority: priority,
    followUpRecommendation: `Please schedule an appointment with a ${specialist || 'General Physician'} within ${isHigh ? '24–48 hours' : isMed ? '3–7 days' : '2–4 weeks'} for proper evaluation.`,
    lifestyleChanges: [
      'Get adequate rest (7–8 hours per night)',
      'Stay hydrated with 2–3 litres of water daily',
      'Avoid strenuous physical activity until evaluated',
      'Monitor and track symptom changes daily',
    ],
    medicationHints: [
      'Do not self-medicate without professional advice',
      'Bring a list of current medications to your doctor appointment',
      'Note any allergies to medications or substances',
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      sessionId, callId, transcript, messages,
      patientName, symptoms, specialist,
    } = await request.json();

    // FIX: Accept either messages OR a transcript string — don't reject if messages is empty
    const hasMessages = messages && messages.length > 0;
    const hasTranscript = transcript && transcript.trim().length > 5;

    if (!hasMessages && !hasTranscript) {
      // Last resort: create minimal transcript from symptoms
      console.warn('No messages or transcript — using symptom fallback');
    }

    // Build full transcript from messages if not provided as string
    let fullTranscript = transcript || '';
    let patientMessages: string[] = [];
    let aiMessages: string[] = [];

    if (hasMessages) {
      const extracted = extractMedicalDataFromTranscript(messages);
      patientMessages = extracted.patientMessages;
      aiMessages = extracted.aiMessages;
      // Only override if extracted transcript is richer
      if (extracted.fullTranscript.length > fullTranscript.length) {
        fullTranscript = extracted.fullTranscript;
      }
    }

    // If still no transcript, build minimal one from symptoms
    if (!fullTranscript || fullTranscript.trim().length < 5) {
      fullTranscript = `Patient: ${patientName || 'Unknown'} is experiencing: ${symptoms || 'not specified'}.\nDoctor: I understand, let me analyze your symptoms.`;
    }

    console.log('Analyzing transcript:', { length: fullTranscript.length, messages: messages?.length || 0 });

    // Run Gemini analysis — with fallback if Gemini fails
    let analysis: any;
    let usedFallback = false;
    try {
      analysis = await analyzeMedicalTranscript(fullTranscript, {
        name: patientName,
        symptoms,
        specialist,
      });
    } catch (geminiErr: any) {
      console.warn('Gemini failed, using fallback analysis:', geminiErr.message);
      analysis = buildFallbackAnalysis(fullTranscript, patientName, symptoms, specialist);
      usedFallback = true;
    }

    // Update session in database
    if (sessionId) {
      await updateSession(sessionId, {
        transcript: fullTranscript,
        aiResponse: JSON.stringify({ analysis, vapiCallId: callId, messageCount: messages?.length || 0 }),
        duration: 0,
        status: 'completed',
        medicalData: analysis,
        currentStep: 5,
      });

      // Create report — use upsert pattern (try to avoid duplicates)
      try {
        await createReport({
          sessionId,
          userId,
          title: `Medical Analysis — ${patientName} — ${new Date().toLocaleDateString()}`,
          summary: analysis.summary,
          symptoms: analysis.symptoms,
          recommendations: analysis.recommendations,
          diagnosis: analysis.diagnosis,
          specialist,
          confidence: analysis.confidence,
        });
      } catch (reportErr) {
        // Report creation failed (maybe duplicate), not fatal
        console.warn('Report creation warning:', reportErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      fullTranscript,
      usedFallback,
      stats: {
        totalMessages: messages?.length || 0,
        patientMessages: patientMessages.length,
        aiMessages: aiMessages.length,
      },
    });
  } catch (error: any) {
    console.error('Error analyzing conversation:', {
      message: error.message,
      stack: error.stack?.slice(0, 300),
    });
    return NextResponse.json({
      error: error.message || 'Failed to analyze conversation',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
