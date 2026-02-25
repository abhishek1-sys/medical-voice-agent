import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserReports, getSessionById } from '@/lib/db/queries';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reports = await getUserReports(userId);

    // Enrich each report with session's medicalData (contains full Gemini analysis)
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let medicalData = null;
        if (report.sessionId) {
          try {
            const session = await getSessionById(report.sessionId);
            medicalData = session?.medicalData || null;
          } catch {}
        }
        return { ...report, medicalData };
      })
    );

    return NextResponse.json({ reports: enrichedReports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
