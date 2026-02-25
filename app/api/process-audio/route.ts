import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/services/assemblyai';
import { analyzeMedicalTranscript } from '@/lib/services/gemini';
import { updateSession, createReport } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string | null;
    const patientName = formData.get('patientName') as string | null;
    const symptoms = formData.get('symptoms') as string | null;
    const specialist = formData.get('specialist') as string | null;
    // "final" flag = this is the last recording, run full analysis + save report
    const isFinal = formData.get('isFinal') === 'true';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Always transcribe
    const transcription = await transcribeAudio(buffer);

    // Step 2: Run full medical analysis only on final turn (or if no sessionId = single-shot mode)
    if (isFinal || !sessionId) {
      const analysis = await analyzeMedicalTranscript(transcription.text, {
        name: patientName ?? undefined,
        symptoms: symptoms ?? undefined,
        specialist: specialist ?? undefined,
      });

      if (sessionId) {
        await updateSession(sessionId, {
          transcript: transcription.text,
          aiResponse: JSON.stringify(analysis),
          duration: Math.round(transcription.duration || 0),
          status: 'completed',
          medicalData: analysis,
          currentStep: 5,
        });
      }

      const report = sessionId
        ? await createReport({
            sessionId,
            userId,
            title: `Medical Analysis - ${patientName || 'Patient'} - ${new Date().toLocaleDateString()}`,
            summary: analysis.summary,
            symptoms: analysis.symptoms,
            recommendations: analysis.recommendations,
            diagnosis: analysis.diagnosis,
            specialist: specialist ?? undefined,
            confidence: analysis.confidence,
          })
        : null;

      return NextResponse.json({
        success: true,
        transcript: transcription.text,
        analysis,
        report,
      });
    }

    // Non-final turn: just return transcript for the conversation loop
    return NextResponse.json({
      success: true,
      transcript: transcription.text,
    });
  } catch (error) {
    console.error('Audio processing error:', error);
    return NextResponse.json({ error: 'Failed to process audio' }, { status: 500 });
  }
}
