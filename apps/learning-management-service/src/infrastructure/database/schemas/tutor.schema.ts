import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

// Learning Management Service owns tutor and learning data
// User references are by ID only - actual user data comes from Identity Service via API

// Tutors table - Learning Management Service's view of tutors
export const tutors = pgTable('tutors', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Reference to user in Identity Service (by ID only)
  userId: uuid('user_id').notNull().unique(),
  // Cached user info for performance (synced via events)
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  // Tutor-specific data owned by Learning Management Service
  hourlyRate: integer('hourly_rate'), // in cents
  currency: varchar('currency', { length: 3 }).default('USD'),
  availability: jsonb('availability').default({}),
  subjects: jsonb('subjects').default([]),
  languages: jsonb('languages').default([]),
  experience: text('experience'),
  qualifications: jsonb('qualifications').default([]),
  isVerified: boolean('is_verified').default(false),
  rating: integer('rating').default(0), // average rating * 100 (for precision)
  totalLessons: integer('total_lessons').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Students table - Learning Management Service's view of students
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Reference to user in Identity Service (by ID only)
  userId: uuid('user_id').notNull().unique(),
  // Cached user info for performance (synced via events)
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  // Student-specific data owned by Learning Management Service
  learningGoals: jsonb('learning_goals').default([]),
  preferredLanguages: jsonb('preferred_languages').default([]),
  skillLevel: varchar('skill_level', { length: 50 }).default('BEGINNER'),
  timezone: varchar('timezone', { length: 50 }),
  totalLessons: integer('total_lessons').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Courses table
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tutorId: uuid('tutor_id').notNull().references(() => tutors.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  subject: varchar('subject', { length: 100 }).notNull(),
  skillLevel: varchar('skill_level', { length: 50 }).notNull(),
  price: integer('price').notNull(), // in cents
  currency: varchar('currency', { length: 3 }).default('USD'),
  duration: integer('duration'), // in minutes
  maxStudents: integer('max_students').default(1),
  isActive: boolean('is_active').default(true),
  syllabus: jsonb('syllabus').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Lessons table
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id),
  tutorId: uuid('tutor_id').notNull().references(() => tutors.id),
  studentId: uuid('student_id').notNull().references(() => students.id),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull(), // in minutes
  status: varchar('status', { length: 50 }).notNull().default('SCHEDULED'),
  meetingUrl: varchar('meeting_url', { length: 500 }),
  recordingUrl: varchar('recording_url', { length: 500 }),
  notes: text('notes'),
  materials: jsonb('materials').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Matching Requests table
export const matchingRequests = pgTable('matching_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  subject: varchar('subject', { length: 100 }).notNull(),
  skillLevel: varchar('skill_level', { length: 50 }).notNull(),
  description: text('description'),
  budget: integer('budget'), // in cents
  preferredLanguages: jsonb('preferred_languages').default([]),
  availability: jsonb('availability').default({}),
  requirements: jsonb('requirements').default({}),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'),
  matchedTutorId: uuid('matched_tutor_id').references(() => tutors.id),
  matchedAt: timestamp('matched_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Tutor Availability table
export const tutorAvailability = pgTable('tutor_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  tutorId: uuid('tutor_id').notNull().references(() => tutors.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar('start_time', { length: 8 }).notNull(), // HH:MM:SS format
  endTime: varchar('end_time', { length: 8 }).notNull(), // HH:MM:SS format
  timezone: varchar('timezone', { length: 50 }).notNull(),
  isRecurring: boolean('is_recurring').default(true),
  effectiveFrom: timestamp('effective_from').defaultNow(),
  effectiveUntil: timestamp('effective_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type exports for TypeScript
export type Tutor = typeof tutors.$inferSelect;
export type NewTutor = typeof tutors.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type MatchingRequest = typeof matchingRequests.$inferSelect;
export type NewMatchingRequest = typeof matchingRequests.$inferInsert;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;
export type NewTutorAvailability = typeof tutorAvailability.$inferInsert;