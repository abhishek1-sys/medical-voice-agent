import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCallDetails } from '@/lib/services/vapi';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json({ error: 'Call ID required' }, { status: 400 });
    }

    const callDetails = await getCallDetails(callId);

    return NextResponse.json({
      success: true,
      ...callDetails
    });
  } catch (error: any) {
    console.error('Error fetching call details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch call details' },
      { status: 500 }
    );
  }
}
