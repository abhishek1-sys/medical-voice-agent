import { db } from './index';
import { sessions, reports, userPreferences, NewSession, NewReport } from './schema';
import { eq, desc } from 'drizzle-orm';

// Session Queries
export async function createSession(data: Partial<NewSession> & { userId: string }) {
  const [session] = await db.insert(sessions).values({ ...data, status: 'draft', currentStep: 1 }).returning();
  return session;
}

export async function updateSession(id: string, data: Partial<NewSession>) {
  const [session] = await db
    .update(sessions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning();
  return session;
}

export async function getSessionById(id: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  return session;
}

export async function getUserSessions(userId: string, limit = 20) {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);
}

// Report Queries
export async function createReport(data: NewReport) {
  const [report] = await db.insert(reports).values(data).returning();
  return report;
}

export async function getReportBySessionId(sessionId: string) {
  const [report] = await db.select().from(reports).where(eq(reports.sessionId, sessionId));
  return report;
}

export async function getUserReports(userId: string, limit = 20) {
  return await db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

export async function getSessionWithReport(sessionId: string) {
  const session = await getSessionById(sessionId);
  if (!session) return null;
  const report = await getReportBySessionId(sessionId);
  return { session, report };
}

// User Preferences Queries
export async function getUserPreferences(userId: string) {
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
  if (!prefs) {
    const [newPrefs] = await db.insert(userPreferences).values({ userId }).returning();
    return newPrefs;
  }
  return prefs;
}
