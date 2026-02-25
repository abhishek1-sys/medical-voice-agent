import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createMedicalAssistant } from '@/lib/services/vapi';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { specialistId, specialistName, patientName, symptoms } = await request.json();

    if (!specialistId || !specialistName || !patientName || !symptoms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Vapi assistant for this medical consultation
    const assistant = await createMedicalAssistant(
      specialistId,
      specialistName,
      patientName,
      symptoms
    );

    return NextResponse.json({
      success: true,
      assistantId: assistant.id,
      assistant
    });
  } catch (error: any) {
    console.error('Error creating Vapi assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create voice assistant' },
      { status: 500 }
    );
  }
}
