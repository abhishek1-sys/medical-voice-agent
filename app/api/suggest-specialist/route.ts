import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { suggestSpecialist } from '@/lib/services/gemini';
import { updateSession } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { sessionId, symptoms, additionalDetails } = await request.json();

    if (!symptoms) return NextResponse.json({ error: 'Symptoms required' }, { status: 400 });

    // suggestSpecialist never throws — falls back to rule-based if OpenAI fails
    const suggestion = await suggestSpecialist(symptoms, additionalDetails || '');

    // Update session with suggestion (best-effort — don't fail if DB errors)
    if (sessionId) {
      try {
        await updateSession(sessionId, {
          suggestedSpecialist: suggestion.specialistId,
          specialistReason: suggestion.reason,
          currentStep: 4,
          status: 'in_progress',
        });
      } catch (dbErr) {
        console.error('DB update error (non-fatal):', dbErr);
      }
    }

    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    console.error('Specialist suggestion error:', error);
    // Even on unexpected error, return a safe fallback
    return NextResponse.json({
      success: true,
      suggestion: {
        specialistId: 'general',
        specialistName: 'General Physician',
        reason: 'A general physician can assess your symptoms and guide further treatment.',
        urgency: 'medium',
        alternativeSpecialists: [],
      }
    });
  }
}
