import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// User Role Enum - Identity Service owns user roles
export const userRoleEnum = pgEnum('user_role', ['STUDENT', 'TUTOR', 'ADMIN', 'SUPER_ADMIN']);

// User Status Enum - Identity Service owns user status
export const userStatusEnum = pgEnum('user_status', ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);

// Users table - Core user identity data owned by Identity Service
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('STUDENT'),
  status: userStatusEnum('status').notNull().default('PENDING_VERIFICATION'),
  bio: text('bio'),
  skills: jsonb('skills').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Profiles table - Extended profile information
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  timezone: varchar('timezone', { length: 50 }),
  language: varchar('language', { length: 10 }).default('en'),
  preferences: jsonb('preferences').default({}),
  settings: jsonb('settings').default({}),
  profilePictureUrl: varchar('profile_picture_url', { length: 500 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  dateOfBirth: timestamp('date_of_birth'),
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User Sessions table - Authentication sessions
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  deviceInfo: varchar('device_info', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 1000 }),
  isActive: jsonb('is_active').default(true),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Auth Tokens table - JWT tokens, reset tokens, etc.
export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: varchar('token', { length: 500 }).notNull(),
  tokenType: varchar('token_type', { length: 50 }).notNull(), // JWT, RESET_PASSWORD, EMAIL_VERIFICATION
  metadata: jsonb('metadata').default({}),
  isUsed: jsonb('is_used').default(false),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Type exports for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type NewAuthToken = typeof authTokens.$inferInsert;