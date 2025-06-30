# Service Boundary Analysis: User Service vs Tutor Matching Service

**Document Type**: Architectural Decision Record (ADR)
**Status**: Proposed
**Date**: Phase 1, Day 7 (Updated: Admin Model Revised)
**Decision Makers**: Backend Team, Product Architecture

---

## 🎯 **Problem Statement**

We need to determine the optimal distribution of domain logic between **User Service** and **Tutor Matching Service**, specifically around tutor-related business rules, reputation systems, and performance tracking.

**Current State**: User Service contains all user-related domain logic including tutor-specific business rules.

**Question**: Should tutor-specific domain logic be moved to Tutor Matching Service for better domain separation?

---

## 🏛️ **Domain-Driven Design Analysis**

### **User Service Bounded Context**
**Core Responsibility**: User Identity & Access Management

**Primary Domain Concerns**:
- User identity and authentication
- Role-based access control (Student, Tutor, Admin)
- Account lifecycle management
- Basic profile information
- Security and permissions
- Inter-service user data consistency
- **Superadmin operations** for admin management

### **Tutor Matching Service Bounded Context**
**Core Responsibility**: Tutoring Business Operations

**Primary Domain Concerns**:
- Tutor-student matching algorithms
- Subject expertise and qualifications
- Availability scheduling
- Session management
- Tutoring performance analytics
- Specialized tutor business rules

---

## 📊 **Current Domain Logic Distribution**

### **✅ Should Stay in User Service**

#### **1. Role Management & Transitions**
- **Basic Eligibility**: `canBecomeTutor()` for Students
- **Role Transitions**: Student→Tutor workflow (Admin-approved)
- **Security Validation**: Who can promote whom
- **Rationale**: Core identity management, affects platform-wide permissions

#### **2. Account & Security Management**
- **Account Status**: Active/Inactive management
- **Login Security**: Lockout policies, failed attempts
- **Email Management**: Change policies, verification
- **Rationale**: Identity security is User Service's primary responsibility

#### **3. Admin Management (Updated)**
- **Admin Creation**: **Superadmin-only system operations**
- **Admin Role Changes**: Handled exclusively by superadmin
- **Security Isolation**: Admin operations separated from normal workflows
- **Rationale**: Critical security operations require isolated system-level control

#### **4. Basic User Profile**
- **Personal Information**: Name, email, contact details
- **Profile Completeness**: Basic profile validation
- **Account Metrics**: Registration date, basic activity
- **Rationale**: Core user data needed across all services

### **🔄 Should Move to Tutor Matching Service**

#### **1. Tutoring-Specific Business Logic**
- **Tutor Tier Classification**: Junior/Senior/Expert calculation
- **Subject Expertise**: Skills, qualifications, certifications
- **Availability Management**: Schedule, time zones, booking rules
- **Rationale**: Domain-specific to tutoring operations

#### **2. Performance & Quality Metrics**
- **Session-Based Reputation**: Performance in actual tutoring sessions
- **Response Time Tracking**: Tutor responsiveness to booking requests
- **Cancellation Rate Monitoring**: Session-specific performance
- **Student Feedback Integration**: Tutoring quality assessment
- **Rationale**: Directly related to tutoring service quality

#### **3. Matching & Recommendation Logic**
- **Tutor Recommendation**: Best tutor for student needs
- **Availability Matching**: Schedule compatibility
- **Subject Matter Expertise**: Skill-based matching
- **Rationale**: Core matching service functionality

### **🤝 Shared Concerns (Integration Points)**

#### **1. Reputation System (Hybrid Approach)**
```
User Service:
- Base reputation (account age, role status, basic activity)
- Cross-platform reputation (affects all services)

Tutor Matching Service:
- Tutoring-specific reputation (session quality, expertise)
- Subject-specific ratings and feedback
```

#### **2. Role Promotion Workflow (Updated)**
```
User Service:
- Basic eligibility validation (account age, current role)
- Student→Tutor role transition execution (Admin-approved)
- Admin creation (Superadmin-only system operations)

Tutor Matching Service:
- Tutoring qualification assessment
- Skills and subject matter validation
- Teaching experience verification
```

---

## 🔧 **Recommended Service Architecture**

### **User Service Responsibilities**

**Core Domain**:
```typescript
// Keep in User Service
UserDomainService:
- canBecomeBasicTutor(user: User): boolean  // Basic eligibility
- validateUserTransition(from, to, requestedBy): void  // Student->Tutor only
- canChangeEmail(user: User): boolean
- calculateBasicReputationScore(user: User): number
- createAdminUser(userData): User  // Superadmin-only operation

UserBusinessRules:
- MIN_REGISTRATION_DAYS_FOR_TUTOR = 7
- canBecomeTutor(user): boolean
- shouldLockAccount(user, failedAttempts): boolean
```

### **Tutor Matching Service Responsibilities**

**New Domain Logic**:
```typescript
// Move to Tutor Matching Service
TutorDomainService:
- canBecomeProfessionalTutor(tutor: Tutor): boolean
- calculateTutoringReputationScore(tutor, sessions): number
- getTutorTier(performance: TutorPerformance): TutorTier
- determineBestMatch(student, requirements): Tutor[]

TutorBusinessRules:
- MIN_SESSIONS_FOR_SENIOR_TUTOR = 50
- MAX_CANCELLATION_RATE = 0.15
- MIN_REPUTATION_FOR_PREMIUM = 75
- getRequiredQualifications(subject: Subject): Qualification[]
```

### **Service Integration Pattern (Updated)**

```typescript
// User Service API
POST /users/{id}/promote-to-tutor
{
  basicEligibility: true,  // Validated by User Service
  qualifications: {...}    // Sent to Tutor Matching Service
}

// Admin Creation (Superadmin-only)
POST /admin/users/create-admin
{
  email: string,
  firstName: string,
  lastName: string
}

// Integration Flow:
1. User Service validates basic eligibility
2. Tutor Matching Service validates qualifications
3. User Service executes role transition (Admin-approved)
4. Tutor Matching Service creates tutor profile

// Admin Operations:
1. Superadmin creates admin via system operation
2. Bypasses normal business validation
3. Direct assignment with full audit trail
```

---

## 🎯 **Migration Strategy**

### **Phase 1: Current State (Complete)**
- ✅ All logic in User Service
- ✅ Basic domain foundation established
- ✅ Business rules centralized
- ✅ Admin model updated to superadmin-only

### **Phase 2: Service Boundary Definition (Recommended Next)**
1. **Define Tutor Matching Service domain model**
2. **Create integration contracts between services**
3. **Plan data consistency strategies**
4. **Design superadmin operation interfaces**

### **Phase 3: Gradual Migration (Future)**
1. **Extract tutor-specific logic** to Tutor Matching Service
2. **Implement service integration patterns**
3. **Maintain data consistency across boundaries**
4. **Preserve superadmin operation isolation**

### **Phase 4: Optimization (Future)**
1. **Event-driven synchronization** between services
2. **Performance optimization** for cross-service calls
3. **Advanced matching algorithms**
4. **Enhanced superadmin operation auditing**

---

## ✅ **Decision Recommendation**

### **Short Term (Current Phase 1)**
**Keep current implementation** - All logic in User Service for now

**Rationale**:
- ✅ Faster initial development
- ✅ Simpler testing and debugging
- ✅ Clear domain foundation established
- ✅ Easier to refactor later with clear boundaries
- ✅ Superadmin operations properly isolated

### **Medium Term (Phase 2-3)**
**Extract tutor-specific logic** to Tutor Matching Service

**Benefits**:
- 🎯 Better domain separation
- 📈 Independent scaling of tutoring features
- 🔧 Specialized tutor business logic
- 👥 Team ownership clarity
- 🛡️ Maintained security isolation for admin operations

### **Integration Points (Updated)**
```typescript
// User Service provides basic user context
interface UserContext {
  userId: string;
  role: UserRole;
  isActive: boolean;
  basicReputation: number;
  accountAge: number;
}

// Tutor Matching Service manages tutoring domain
interface TutorContext {
  tutorId: string;
  subjects: Subject[];
  availability: Schedule;
  performanceMetrics: TutorMetrics;
  qualifications: Qualification[];
}

// Superadmin Operations (User Service only)
interface SuperadminOperations {
  createAdmin(userData: AdminCreationData): User;
  updateAdminRole(adminId: string, changes: AdminChanges): void;
  deactivateAdmin(adminId: string, reason: string): void;
}
```

---

## 🚀 **Immediate Next Steps**

### **For Current Phase 1**
1. ✅ **Continue with User Service** domain implementation
2. ✅ **Complete Phase 1** with current architecture
3. ✅ **Document integration points** for future extraction
4. ✅ **Test superadmin operations** thoroughly

### **For Future Phases**
1. **Design Tutor Matching Service** domain model
2. **Plan service communication patterns**
3. **Define data consistency strategies**
4. **Create migration roadmap**
5. **Design secure superadmin operation interfaces**

---

## 📋 **Conclusion**

**Current Decision**: Keep all user-related logic in User Service for Phase 1 completion.

**Admin Model**: Superadmin-only creation with no promotion mechanism ensures security.

**Future Direction**: Extract tutor-specific domain logic to Tutor Matching Service in later phases while preserving admin operation isolation.

**Benefits of Current Approach**:
- Faster Phase 1 completion
- Solid domain foundation with secure admin model
- Clear refactoring path
- Reduced complexity during initial development
- Proper security isolation for administrative operations

This approach allows us to establish a strong, secure domain foundation now while maintaining flexibility for future architectural improvements.
