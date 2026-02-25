// FIX: Use '@clerk/nextjs/server' + await auth() — the old '@clerk/nextjs' sync auth() is deprecated in v5
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionWithReport } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await getSessionWithReport(params.id);
    if (!result) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
