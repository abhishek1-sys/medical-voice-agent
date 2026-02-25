import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { summarizeAnalysis } from '@/lib/services/gemini';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { analysis, patientName } = await request.json();
    if (!analysis) return NextResponse.json({ error: 'No analysis data' }, { status: 400 });

    const summary = await summarizeAnalysis(analysis, patientName || 'Patient');
    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Summarize error:', error);
    return NextResponse.json({ error: error.message || 'Failed to summarize' }, { status: 500 });
  }
}
