# User Domain Business Processes & Rules

**Document Type**: Business Specification
**Audience**: Product Managers, Business Analysts, QA Team, Stakeholders
**Last Updated**: Phase 1, Day 7 - Enhanced Domain Implementation (Admin Model Updated)

---

## 🎯 **Overview**

This document describes the business processes, rules, and policies implemented in the User Domain of our EdTech platform. These rules govern user lifecycle management, role transitions, account security, and platform access policies.

## 👥 **User Types & Roles**

### **Student Role**
- **Purpose**: Platform learners seeking educational content and tutoring
- **Default Role**: New registrations default to Student unless specific criteria met
- **Capabilities**: Access learning content, book tutoring sessions, leave reviews
- **Progression Path**: Student → Tutor (with eligibility requirements)

### **Tutor Role**
- **Purpose**: Qualified educators providing teaching services
- **Requirements**: Must meet promotion eligibility criteria
- **Capabilities**: Conduct tutoring sessions, create educational content, earn revenue
- **Performance Tracking**: Reputation scoring and tier classification
- **Promotion**: Can be promoted by existing admins from Student role

### **Admin Role**
- **Purpose**: Platform administrators with full management access
- **Creation Method**: **Superadmin-only operation** - No promotion mechanism
- **Appointment Authority**: Only the platform superadmin can create new admins
- **Capabilities**: Full user management, role promotions, platform configuration
- **Security**: Direct appointment only, bypasses normal business rules

---

## 🔄 **User Lifecycle Management**

### **Registration Process**
1. **Account Creation**: User provides email, name, and basic information
2. **Initial Status**: Account created as `Active` by default
3. **Role Assignment**:
   - Default to `Student` role
   - Smart role suggestion based on email domain
   - Educational domains (.edu, .org) suggested for `Tutor` role
4. **Profile Setup**: Basic profile information collected

### **Account Status Management**
- **Active Account**: Full platform access and capabilities
- **Inactive Account**: Suspended access, cannot perform actions
- **Activation Process**: Admins can reactivate suspended accounts
- **Deactivation Triggers**: Policy violations, security concerns, user request

### **Profile Management**
- **Email Changes**: 30-day cooldown period between changes
- **Name Updates**: Allowed with proper validation
- **Profile Completeness**: Tracked for eligibility assessments

---

## 📈 **Role Management Processes**

### **Student to Tutor Promotion**

**Eligibility Requirements**:
- ✅ Account must be active and in good standing
- ✅ Minimum 7 days since registration
- ✅ Complete profile information
- ✅ Must currently hold Student role (no skipping)

**Evaluation Criteria**:
- Email domain analysis (educational institutions preferred)
- Teaching experience indicators
- Profile completeness assessment
- Account history review

**Business Rules**:
- Cannot promote users who already hold Tutor or Admin roles
- Promotion requests must include supporting documentation
- System validates all criteria before approval
- **Authorization**: Only existing admins can promote to Tutor role

### **Admin Role Management**

**Creation Authority**: **Superadmin Only**
- ✅ Only the platform superadmin can create admin accounts
- ✅ No promotion mechanism from Tutor or Student roles
- ✅ Direct appointment through system-level operations
- ✅ Bypasses normal business validation rules

**Security Model**:
- Admin creation is a privileged system operation
- No self-promotion or peer-promotion allowed
- Complete audit trail for all admin appointments
- Superadmin maintains sole control over admin access

**Admin Management**:
- Admin role changes (including demotion) handled by superadmin only
- No normal role transition workflows apply to admin accounts
- Account deactivation possible, but role changes restricted

### **Role Transition Rules**

**Allowed Normal Transitions**:
- Student → Tutor (with admin approval and eligibility validation)
- Any Role → Inactive (account suspension)

**Superadmin-Only Operations**:
- Any Role → Admin (direct appointment)
- Admin → Any Role (demotion/role change)
- Admin account management and modifications

**Forbidden Transitions**:
- Any promotion to Admin through normal workflows
- Same role transitions (redundant)
- Inactive users cannot change roles through normal processes

---

## 🛡️ **Security & Account Protection**

### **Account Lockout Policy**
- **Trigger**: 3 failed login attempts
- **Duration**: 30-minute automatic lockout
- **Recovery**: Time-based unlock or admin intervention
- **Protection**: Prevents brute force attacks

### **Email Security**
- **Change Frequency**: Maximum once per 30 days
- **Validation**: Cannot change to currently used email
- **Inactive Users**: Cannot modify email addresses
- **Verification**: New email requires confirmation process

### **Access Control**
- **Active Status Required**: All actions require active account
- **Role-Based Permissions**: Each role has specific capabilities
- **Admin Privileges**: Can manage users (except other admins)
- **Superadmin Authority**: Exclusive control over admin role management

### **Administrative Security**
- **Superadmin Isolation**: Admin operations separated from normal workflows
- **Audit Requirements**: All admin appointments logged and tracked
- **No Delegation**: Admin creation authority cannot be delegated
- **System Operations**: Admin creation bypasses normal business rules

---

## ⭐ **Reputation & Performance System**

### **Reputation Scoring (0-100 Scale)**

**Base Scoring Components**:
- **Account Status**: +10 points for active accounts
- **Role Bonus**: Students +0, Tutors +20, Admins +30
- **Account Age**: Up to +10 points based on registration duration

**Performance Factors** (Tutors):
- **Review Ratings**: Up to +40 points (average rating × 7 + verification bonus)
- **Session Completion**: +0.5 points per completed session (max +20)
- **Response Time**: Fast responses earn up to +10 points
- **Cancellation Penalty**: -0.5 points per percentage of cancellation rate

**Quality Thresholds**:
- **Premium Access**: 75+ reputation score
- **Senior Tutor**: 80+ score + 50+ completed sessions
- **Expert Tutor**: 90+ score + performance criteria

### **Tutor Tier Classification**

**Junior Tutor**:
- New tutors or high cancellation rate (>15%)
- Basic platform features and visibility
- Standard commission rates

**Senior Tutor**:
- 50+ completed sessions AND 80+ reputation
- Enhanced platform features
- Better search ranking and premium rates

**Expert Tutor**:
- 90+ reputation score
- Exceptional performance metrics
- Highest visibility and premium pricing

### **Performance Monitoring**
- **Cancellation Rate Tracking**: Maximum 15% allowed for tier maintenance
- **Response Time Monitoring**: Impacts reputation scoring
- **Review Verification**: Verified reviews carry higher weight
- **Session Quality**: Completion rates affect scoring

---

## 🎯 **Platform Access Policies**

### **Premium Feature Access**
- **Automatic**: Admins receive premium access
- **Reputation-Based**: 75+ reputation score qualifies
- **Benefits**: Advanced features, priority support, enhanced visibility

### **Content Creation Rights**
- **Students**: Limited content creation capabilities
- **Tutors**: Full content creation and monetization
- **Admins**: Platform-wide content management

### **Session Management**
- **Booking**: Students can book, Tutors can accept/decline
- **Cancellation**: Tracked and impacts reputation
- **Completion**: Affects tutor tier and reputation

---

## 📊 **Business Metrics & Analytics**

### **User Quality Indicators**
- **Profile Completeness**: Percentage of required fields filled
- **Account Age**: Days since registration
- **Engagement Level**: Platform activity and interaction
- **Performance Trends**: Reputation changes over time

### **Platform Health Metrics**
- **Role Distribution**: Balance of Students, Tutors, Admins
- **Tutor Promotion Success Rate**: Percentage of successful Student→Tutor transitions
- **Account Retention**: Active vs inactive account ratios
- **Quality Assurance**: Average reputation scores by role

### **Administrative Metrics**
- **Admin Appointments**: Track admin account creation
- **Superadmin Activity**: Monitor administrative operations
- **Role Management**: Track normal vs system-level role changes

---

## 🚀 **Operational Workflows**

### **Daily Operations**
- Monitor account lockout incidents
- Review tutor promotion requests
- Track reputation score changes
- Identify quality issues or policy violations

### **Weekly Analysis**
- Analyze user tier distributions
- Review premium access utilization
- Monitor cancellation rate trends
- Assess platform quality metrics

### **Monthly Reviews**
- Evaluate business rule effectiveness
- Analyze tutor promotion success rates
- Review security incident patterns
- Plan policy adjustments based on data

### **Administrative Operations** (Superadmin)
- Review admin access requirements
- Create admin accounts as needed
- Monitor administrative activity
- Ensure security compliance

---

## 📋 **Policy Compliance & Governance**

### **Data Protection**
- User information handled according to privacy policies
- Role changes logged for audit purposes
- Account actions tracked for compliance

### **Administrative Governance**
- Superadmin operations fully audited
- Admin appointment justification required
- Regular review of admin access needs
- Compliance with security protocols

### **Quality Assurance**
- Regular review of business rule effectiveness
- Performance monitoring and adjustment
- User feedback integration into policy updates

### **Business Continuity**
- Automated enforcement of business rules
- Fail-safe mechanisms for critical processes
- Audit trails for all user management actions
- Secure admin appointment procedures

---

This business specification ensures consistent, fair, and secure user management across our EdTech platform while maintaining strict control over administrative access and supporting growth with quality standards.
