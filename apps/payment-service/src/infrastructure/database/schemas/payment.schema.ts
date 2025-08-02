import { pgTable, uuid, varchar, integer, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Payment Service owns all financial data
// User references are by ID only - actual user data comes from Identity Service via API
// Lesson references are by ID only - actual lesson data comes from Learning Management Service via API

// Payment Status Enum
export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED'
]);

// Transaction Type Enum
export const transactionTypeEnum = pgEnum('transaction_type', [
  'CHARGE',
  'TRANSFER',
  'REFUND',
  'PAYOUT',
  'COMMISSION'
]);

// Payout Status Enum
export const payoutStatusEnum = pgEnum('payout_status', [
  'PENDING',
  'IN_TRANSIT',
  'PAID',
  'FAILED',
  'CANCELLED'
]);

// Payments table - Core payment processing
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  // External references (no foreign keys - microservice boundaries)
  lessonId: uuid('lesson_id'), // Reference to lesson in learning-management-service
  studentUserId: uuid('student_user_id').notNull(), // Reference to user in identity-service
  tutorUserId: uuid('tutor_user_id').notNull(), // Reference to user in identity-service
  // Cached user info for performance and record-keeping
  studentEmail: varchar('student_email', { length: 255 }),
  tutorEmail: varchar('tutor_email', { length: 255 }),
  // Payment details
  amount: integer('amount').notNull(), // in cents
  platformFee: integer('platform_fee').notNull(), // 20% commission in cents
  tutorEarnings: integer('tutor_earnings').notNull(), // 80% in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  // Stripe integration
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeConnectedAccountId: varchar('stripe_connected_account_id', { length: 255 }),
  // Additional details
  description: varchar('description', { length: 500 }),
  paymentMethodType: varchar('payment_method_type', { length: 50 }), // card, bank_transfer, etc.
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transactions table - Detailed transaction tracking
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(), // in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  stripeTransactionId: varchar('stripe_transaction_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  description: varchar('description', { length: 500 }),
  balanceTransactionId: varchar('balance_transaction_id', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Payouts table - Tutor payment management
export const payouts = pgTable('payouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tutorUserId: uuid('tutor_user_id').notNull(), // Reference to user in identity-service
  tutorEmail: varchar('tutor_email', { length: 255 }), // Cached for records
  amount: integer('amount').notNull(), // in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  period: varchar('period', { length: 20 }).notNull(), // e.g., "2024-01" or "weekly-2024-01-15"
  payoutType: varchar('payout_type', { length: 20 }).default('MONTHLY'), // WEEKLY, MONTHLY, MANUAL
  stripePayoutId: varchar('stripe_payout_id', { length: 255 }),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  bankAccount: varchar('bank_account', { length: 4 }), // Last 4 digits for display
  status: payoutStatusEnum('status').notNull().default('PENDING'),
  scheduledAt: timestamp('scheduled_at').notNull(),
  completedAt: timestamp('completed_at'),
  failureReason: varchar('failure_reason', { length: 500 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Invoices table - Billing records and tax documentation
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id),
  studentUserId: uuid('student_user_id').notNull(),
  tutorUserId: uuid('tutor_user_id').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amount: integer('amount').notNull(), // in cents
  platformFee: integer('platform_fee').notNull(),
  tutorEarnings: integer('tutor_earnings').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  taxAmount: integer('tax_amount').default(0),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Refunds table - Refund processing and tracking
export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  amount: integer('amount').notNull(), // in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  reason: varchar('reason', { length: 500 }),
  refundType: varchar('refund_type', { length: 50 }).default('FULL'), // FULL, PARTIAL
  stripeRefundId: varchar('stripe_refund_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'),
  requestedBy: uuid('requested_by'), // User ID who requested refund
  approvedBy: uuid('approved_by'), // Admin/system who approved refund
  processedAt: timestamp('processed_at'),
  failureReason: varchar('failure_reason', { length: 500 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stripe Accounts table - Connected account management for tutors
export const stripeAccounts = pgTable('stripe_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tutorUserId: uuid('tutor_user_id').notNull().unique(), // Reference to user in identity-service
  stripeAccountId: varchar('stripe_account_id', { length: 255 }).notNull().unique(),
  onboardingComplete: boolean('onboarding_complete').default(false),
  payoutsEnabled: boolean('payouts_enabled').default(false),
  chargesEnabled: boolean('charges_enabled').default(false),
  country: varchar('country', { length: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  businessType: varchar('business_type', { length: 50 }), // individual, company
  // Cached account details
  accountEmail: varchar('account_email', { length: 255 }),
  bankAccountLast4: varchar('bank_account_last4', { length: 4 }),
  defaultCurrency: varchar('default_currency', { length: 3 }),
  // Status tracking
  verificationStatus: varchar('verification_status', { length: 50 }),
  requirementsCurrentlyDue: jsonb('requirements_currently_due').default([]),
  requirementsEventuallyDue: jsonb('requirements_eventually_due').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Commission Tracking table - Platform revenue tracking
export const commissions = pgTable('commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  amount: integer('amount').notNull(), // Platform fee in cents
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  rate: integer('rate').notNull().default(2000), // 20% = 2000 basis points
  lessonId: uuid('lesson_id'), // Reference to lesson
  tutorUserId: uuid('tutor_user_id').notNull(),
  studentUserId: uuid('student_user_id').notNull(),
  period: varchar('period', { length: 20 }).notNull(), // For revenue reporting
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Type exports for TypeScript
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type NewStripeAccount = typeof stripeAccounts.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type NewCommission = typeof commissions.$inferInsert;