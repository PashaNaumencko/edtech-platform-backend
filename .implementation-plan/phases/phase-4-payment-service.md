# Phase 4: Payment Service & Billing (Enhanced with Preply Business Model)
**Sprint 9-10 | Duration: 2 weeks**

## Phase Objectives
Implement the Payment Service with **Preply-inspired business model enhancements** including trial-first approach, performance-based commission tiers, and package-based pricing, supporting both per-lesson payments and full-course payments with superior tutor economics.

### Key Preply Adoptions in This Phase
1. **Trial-First Approach**: Free/low-cost trial lessons with satisfaction guarantee
2. **Performance-Based Commission Tiers**: 25% → 15% based on teaching hours (better than Preply)
3. **Package-Based Pricing**: 5-lesson math packages, 8-lesson coding projects
4. **Enhanced Trial Handling**: 50% commission vs regular lessons (fairer than Preply's 100%)
5. **Internal Wallet System**: Tutor earnings management with multiple withdrawal methods

## Phase Dependencies
- **Prerequisites**: Phase 1 (User Service), Phase 2 (Courses Service), Phase 3 (Tutor Matching) completed
- **Requires**: User authentication, course enrollment data, tutor profiles
- **Outputs**: Functional payment processing, commission calculation, financial reporting

## Detailed Subphases

### 4.1 Payment Infrastructure Setup
**Duration: 2 days | Priority: Critical**

#### PostgreSQL Database Design
- Payments table with ACID compliance for financial transactions
- PaymentMethods table for stored payment information
- Commissions table for platform fee tracking
- PayoutSchedule table for tutor earnings management
- Financial audit trail with immutable records

#### Stripe Integration Setup
- Stripe Connect for marketplace payments
- Webhook endpoint configuration
- Payment method tokenization
- Multi-party payment flows
- Currency and international payment support

#### ECS Fargate Service
- Dedicated Payment Service container
- Enhanced security configuration
- PCI DSS compliance considerations
- Monitoring and alerting setup

### 4.2 Enhanced Payment Model Design (Preply-Inspired)
**Duration: 4 days | Priority: Critical**

#### Trial Lesson Payment Model
```typescript
interface TrialLessonPayment {
  trialLessonId: string;
  studentId: string;
  tutorId: string;
  amount: Money; // Free or low-cost
  platformCommission: Money; // 50% (better than Preply's 100%)
  tutorEarnings: Money; // 50%
  satisfactionGuarantee: boolean;
  replacementEligible: boolean;
  paymentStatus: TrialPaymentStatus;
}
```

#### Performance-Based Lesson Payment Model
```typescript
interface LessonPayment {
  lessonId: string;
  studentId: string;
  tutorId: string;
  amount: Money;
  tutorTeachingHours: number; // For commission tier calculation
  platformCommissionRate: number; // 25% → 15% based on experience
  platformCommission: Money;
  tutorEarnings: Money;
  lessonType: 'TRIAL' | 'REGULAR' | 'PACKAGE';
  paymentStatus: LessonPaymentStatus;
  confirmationRequired: boolean;
}
```

#### Package-Based Payment Model
```typescript
interface PackagePayment {
  packageId: string;
  packageType: 'MATH_5_LESSONS' | 'CODING_8_LESSONS' | 'CUSTOM';
  studentId: string;
  tutorId: string;
  totalAmount: Money;
  lessonsIncluded: number;
  lessonsUsed: number;
  platformCommissionRate: number;
  platformCommission: Money;
  tutorEarnings: Money;
  expirationDate: Date;
  autoRenewal: boolean;
}
```

#### Commission Tier System
```typescript
interface CommissionTier {
  tierName: string;
  minTeachingHours: number;
  maxTeachingHours: number;
  commissionRate: number;
}

const COMMISSION_TIERS: CommissionTier[] = [
  { tierName: 'New Tutor', minTeachingHours: 0, maxTeachingHours: 20, commissionRate: 0.25 },
  { tierName: 'Active Tutor', minTeachingHours: 21, maxTeachingHours: 50, commissionRate: 0.22 },
  { tierName: 'Experienced Tutor', minTeachingHours: 51, maxTeachingHours: 100, commissionRate: 0.20 },
  { tierName: 'Master Tutor', minTeachingHours: 101, maxTeachingHours: 200, commissionRate: 0.18 },
  { tierName: 'Elite Tutor', minTeachingHours: 201, maxTeachingHours: Infinity, commissionRate: 0.15 }
];
```

#### Internal Wallet System
```typescript
interface TutorWallet {
  tutorId: string;
  availableBalance: Money;
  pendingBalance: Money; // Awaiting lesson confirmations
  totalEarnings: Money;
  withdrawalMethods: WithdrawalMethod[];
  payoutSchedule: 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND';
  minWithdrawalAmount: Money;
}
```

### 4.3 Trial-First & Satisfaction Guarantee System
**Duration: 3 days | Priority: Critical**

#### Trial Lesson Workflow
- **Free/Low-Cost Trial Setup**: Configurable trial lesson pricing
- **Satisfaction Guarantee**: Automatic tutor replacement if unsatisfied
- **Trial-to-Regular Conversion**: Streamlined upgrade path
- **Quality Assurance**: Trial lesson completion confirmation system

#### Tutor Replacement System
```typescript
interface TutorReplacementRequest {
  originalTrialId: string;
  studentId: string;
  originalTutorId: string;
  replacementReason: string;
  preferredNewTutor?: string;
  refundRequested: boolean;
  replacementStatus: 'PENDING' | 'MATCHED' | 'COMPLETED';
}
```

#### Lesson Confirmation System
- **Student confirmation required**: Payment only released after confirmation
- **Auto-confirmation**: After 72 hours if no issues reported
- **Dispute handling**: Process for lesson quality disputes
- **Refund automation**: Quick refunds for unsatisfactory trials

#### Package Conversion Incentives
- **Trial-to-package discounts**: Encourage package purchases after successful trials
- **Loyalty bonuses**: Reduced commission rates for consistent tutors
- **Bulk purchase benefits**: Better rates for larger lesson packages

### 4.4 Payment Domain Implementation
**Duration: 3 days | Priority: Critical**

#### Domain Layer Architecture
- Payment aggregate with dual payment types
- Money value object with currency support
- PaymentMethod value object with tokenization
- Commission calculation domain service
- Refund and dispute handling logic

#### Payment States and Workflows
- **Lesson Payments**: Pending → Authorized → Captured → Completed
- **Course Payments**: Pending → Authorized → Captured → Access Granted
- **Refunds**: Requested → Reviewed → Approved/Denied → Processed
- **Disputes**: Opened → Under Review → Resolved

#### Enhanced Business Rules
- **Trial lesson payments**: 50% commission, immediate tutor replacement if unsatisfied
- **Regular lesson payments**: Performance-based commission tiers (25% → 15%)
- **Package payments**: Bulk discount pricing, flexible usage tracking
- **Lesson confirmation**: Student must confirm before tutor payment release
- **Commission tier progression**: Automatic tier upgrades based on teaching hours
- **Wallet management**: Secure internal wallet with multiple withdrawal options

### 4.5 Stripe Integration Implementation
**Duration: 4 days | Priority: Critical**

#### Stripe Connect Setup
```typescript
interface StripeConnectFlow {
  createConnectedAccount(tutorId: string): Promise<string>;
  verifyIdentity(accountId: string): Promise<boolean>;
  setupPayoutSchedule(accountId: string, schedule: PayoutSchedule): Promise<void>;
  processMarketplacePayment(payment: PaymentRequest): Promise<PaymentResult>;
}
```

#### Payment Processing
- **Lesson Payments**: Hold funds until lesson completion
- **Course Payments**: Immediate processing with access control
- **Split Payments**: Automatic distribution to tutors (80%) and platform (20%)
- **Failed Payment Handling**: Retry logic and failure notifications
- **Webhook Processing**: Real-time payment status updates

#### Security and Compliance
- PCI DSS compliance for payment data handling
- Encryption of sensitive financial information
- Secure webhook signature verification
- Payment method tokenization
- Fraud detection integration

### 4.6 Application Layer Implementation
**Duration: 2 days | Priority: Critical**

#### Enhanced CQRS Commands
- ProcessTrialPayment, ProcessLessonPayment, ProcessPackagePayment
- **ConfirmLessonCompletion**, **RequestTutorReplacement**
- **CalculateCommissionTier**, **UpdateTutorWallet**
- RefundPayment, CancelPayment
- SetupPaymentMethod, UpdatePaymentMethod
- **ProcessWalletWithdrawal**, ProcessPayout

#### Enhanced CQRS Queries
- GetPaymentHistory, GetTrialPayments, GetLessonPayments, **GetPackagePayments**
- **GetTutorCommissionTier**, GetTutorEarnings, **GetTutorWalletBalance**
- GetPlatformRevenue, **GetCommissionTierReport**
- **GetTrialConversionMetrics**, GetPayoutSchedule
- GetRefundRequests, **GetTutorReplacementRequests**, GetPaymentAnalytics

#### Enhanced Payment Services
- **Trial lesson service** with satisfaction guarantee
- **Commission tier calculation service** with performance tracking
- **Tutor wallet service** with multiple withdrawal methods
- **Package management service** with usage tracking
- Stripe service for payment processing
- Payout scheduling service
- Refund and dispute management service

### 4.7 Infrastructure Layer Implementation
**Duration: 3 days | Priority: Critical**

#### Enhanced Database Integration
- PostgreSQL repository with ACID transactions
- **Commission tier tracking** and history
- **Tutor wallet balance** management
- **Trial lesson and replacement** data
- Financial data encryption at rest
- Audit trail implementation
- Backup and recovery procedures

#### Enhanced External Service Integration
- Stripe API client with retry logic
- **Multiple withdrawal method integration** (PayPal, Wise, etc.)
- Webhook processing with signature verification
- Currency conversion service integration
- Tax calculation service integration
- **Lesson confirmation notification** service

#### Enhanced REST API Controllers
- **Trial lesson processing** endpoints
- **Package purchase and management** endpoints
- **Tutor wallet and withdrawal** endpoints
- **Commission tier tracking** endpoints
- Payment method management
- Financial reporting endpoints
- Webhook handling endpoints
- Admin and analytics APIs

### 4.8 Financial Reporting & Analytics
**Duration: 2 days | Priority: High**

#### Enhanced Reporting Dashboard
- **Trial-to-regular conversion metrics**
- **Commission tier distribution** analytics
- **Tutor wallet and withdrawal** tracking
- **Package purchase patterns** analysis
- Real-time payment processing metrics
- Commission and revenue analytics
- Tutor earnings and payout tracking
- Payment success/failure rates
- Refund and dispute statistics

#### Enhanced Financial Compliance
- **Performance-based commission** audit trails
- **Trial lesson satisfaction** tracking
- **Tutor replacement cost** analysis
- Transaction audit trails
- Regulatory reporting preparation
- Tax reporting data structure
- Revenue recognition principles
- Financial reconciliation processes

### 4.9 Testing & Validation
**Duration: 1 day | Priority: High**

#### Enhanced Payment Testing
- **Trial lesson workflow** testing
- **Commission tier calculation** testing
- **Tutor replacement process** testing
- **Package purchase and usage** testing
- Stripe test mode integration
- Edge case and error handling testing
- Security penetration testing
- Load testing for high-volume transactions

## Success Criteria

### Technical Acceptance Criteria
- Payment Service deploys successfully with PCI compliance
- Both lesson and course payment flows work correctly
- Stripe integration handles all payment scenarios
- Commission calculations are accurate and consistent
- Database transactions maintain ACID properties
- Webhook processing is reliable and secure

### Financial Acceptance Criteria
- **Performance-based commission tiers** calculate correctly (25% → 15%)
- **Trial lesson commission** (50%) processed correctly
- **Package-based pricing** and usage tracking works
- **Tutor wallet system** manages balances and withdrawals accurately
- **Trial-to-regular conversion** tracking functions properly
- **Satisfaction guarantee and tutor replacement** system operational
- Payment success rate > 98%
- Refund processing works within SLA
- Financial reporting provides accurate insights
- Audit trails capture all financial transactions

### Security Acceptance Criteria
- PCI DSS compliance requirements met
- Payment data properly encrypted
- Webhook signatures verified
- No sensitive data in logs
- Fraud detection mechanisms active

## Risk Mitigation

### Technical Risks
- **Payment Processing Failures**: Implement comprehensive retry and fallback mechanisms
- **Database Consistency**: Use database transactions and implement saga patterns
- **Stripe API Changes**: Version pinning and comprehensive testing
- **Webhook Reliability**: Implement idempotency and duplicate detection

### Financial Risks
- **Commission Calculation Errors**: Comprehensive testing and validation
- **Payment Disputes**: Clear refund policies and dispute resolution processes
- **Currency Fluctuations**: Real-time exchange rate handling
- **Regulatory Compliance**: Regular compliance audits and updates

### Security Risks
- **Payment Fraud**: Implement fraud detection and monitoring
- **Data Breaches**: Encryption, access controls, and security audits
- **PCI Compliance**: Regular compliance assessments and updates

## Key Performance Indicators

### Performance Metrics
- Payment processing time: < 5 seconds
- Database transaction time: < 1 second
- Webhook processing time: < 2 seconds
- API response time: < 500ms

### Financial Metrics
- Payment success rate: > 98%
- Commission calculation accuracy: 100%
- Payout processing time: < 24 hours
- Refund processing time: < 48 hours

### Business Metrics
- Revenue per transaction
- Average transaction value
- Payment method adoption rates
- Customer payment satisfaction

## Phase Timeline

| Subphase | Duration | Dependencies | Critical Path |
|----------|----------|--------------|---------------|
| 4.1 Infrastructure Setup | 2 days | Phase 1-3 | Yes |
| 4.2 Enhanced Payment Model Design | 4 days | 4.1 | Yes |
| 4.3 Trial-First & Satisfaction Guarantee System | 3 days | 4.2 | Yes |
| 4.4 Payment Domain Implementation | 3 days | 4.3 | Yes |
| 4.5 Stripe Integration | 4 days | 4.4 | Yes |
| 4.6 Application Layer | 2 days | 4.5 | Yes |
| 4.7 Infrastructure Layer | 3 days | 4.6 | Yes |
| 4.8 Financial Reporting | 2 days | 4.7 | No |
| 4.9 Testing & Validation | 1 day | 4.7 | Yes |

**Total Duration**: 24 days (4.8 weeks)  
**Buffer**: +2 days for trial system testing and compliance  
**Updated Timeline**: Sprint 9-11 (5 weeks total with buffer)

---

**Previous Phase**: [Phase 3: Tutor Matching Service](phase-3-tutor-matching.md)  
**Next Phase**: [Phase 5: Reviews & Rating System](phase-5-reviews-service.md) 