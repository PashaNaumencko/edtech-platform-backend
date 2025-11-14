import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userAccounts = pgTable("user_accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  cognitoUserId: text("cognito_user_id").notNull().unique(),
  role: text("role").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
