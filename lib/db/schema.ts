import { pgTable, text, timestamp, uuid, jsonb, integer } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),

  // Step 1: Basic Details
  patientName: text('patient_name'),
  age: integer('age'),
  gender: text('gender'),

  // Step 2: Symptoms
  symptoms: text('symptoms'),
  symptomDuration: text('symptom_duration'),

  // Step 3: Additional Details
  additionalDetails: text('additional_details'),
  medicalHistory: text('medical_history'),

  // AI Specialist Suggestion
  suggestedSpecialist: text('suggested_specialist'),
  specialistReason: text('specialist_reason'),
  chosenSpecialist: text('chosen_specialist'),

  // Voice Conversation
  transcript: text('transcript'),
  audioUrl: text('audio_url'),
  aiResponse: text('ai_response'),
  medicalData: jsonb('medical_data'),

  status: text('status').default('draft'), // draft, in_progress, completed, failed
  currentStep: integer('current_step').default(1), // 1-5
  duration: integer('duration'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  symptoms: jsonb('symptoms'),
  recommendations: jsonb('recommendations'),
  diagnosis: text('diagnosis'),
  specialist: text('specialist'),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  language: text('language').default('en'),
  theme: text('theme').default('light'),
  notifications: jsonb('notifications').default({ email: true, push: false }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
