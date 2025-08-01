# EdTech Platform - MVP Implementation Plan

## 🎯 MVP Objective
Build a **minimum viable product** for a tutoring platform where students can find, book, and learn from tutors through video sessions. Focus on core functionality only.

## 📊 Current Status Assessment

### ✅ What's Complete (25% of MVP)
- **User Service**: Domain layer, use cases, GraphQL federation setup
- **Infrastructure**: Database schemas, AWS configuration, Docker setup  
- **Authentication**: AWS Cognito integration, service-to-service auth
- **GraphQL**: Federation gateway configured, User service subgraph ready

### 🔄 What's In Progress (Current Focus)
- **User Service GraphQL**: Resolvers need real use case integration
- **Federation Gateway**: Connect User service to gateway
- **Documentation**: Too much redundant documentation needs cleanup

### ❌ What's Missing for MVP (75% remaining)
- **Tutor Matching Service**: Core tutor discovery and filtering
- **Session Booking**: Book and manage tutoring sessions
- **Payment Processing**: Handle payments for sessions
- **Video Communication**: Integrate video calling for sessions
- **Basic Reviews**: Rate and review tutors
- **Notifications**: Email notifications for bookings

## 🚀 MVP Implementation Roadmap

### Phase 1: Complete User Service (Week 1)
**Goal**: Finish User Service and establish patterns for other services

#### Day 1-2: Fix GraphQL Integration
- [ ] Connect User Service GraphQL to Federation Gateway
- [ ] Test end-to-end GraphQL queries from gateway
- [ ] Fix any integration issues
- [ ] Document GraphQL federation pattern

#### Day 3-4: Complete User Service Features
- [ ] Implement tutor profile management
- [ ] Add user search and filtering
- [ ] Create user preference settings
- [ ] Add comprehensive tests

#### Day 5: Documentation Cleanup & Service Template
- [ ] Delete redundant documentation files
- [ ] Create service implementation template
- [ ] Update CLAUDE.md with simplified guidelines
- [ ] Document MVP-focused patterns

### Phase 2: Tutor Matching Service (Week 2)
**Goal**: Enable students to find and filter tutors

#### Day 1-2: Domain & Application Layer
- [ ] Create tutor entity and value objects
- [ ] Implement search and filter use cases
- [ ] Setup tutor availability management
- [ ] Add tutor profile enrichment

#### Day 3-4: Infrastructure & API
- [ ] Setup PostgreSQL database and repositories
- [ ] Create GraphQL subgraph for tutor queries
- [ ] Connect to federation gateway
- [ ] Add search indexing (basic)

#### Day 5: Integration Testing
- [ ] Test tutor search across services
- [ ] Validate user-tutor relationship queries
- [ ] Performance testing for search
- [ ] Documentation updates

### Phase 3: Session Booking Service (Week 3)
**Goal**: Enable session booking and basic scheduling

#### Day 1-2: Core Booking Logic
- [ ] Create session booking domain
- [ ] Implement availability checking
- [ ] Add booking confirmation use cases
- [ ] Setup basic scheduling

#### Day 3-4: Payment Integration
- [ ] Integrate Stripe for payments
- [ ] Implement payment processing workflow
- [ ] Add refund/cancellation logic
- [ ] Setup webhook handling

#### Day 5: Session Management API
- [ ] Create booking GraphQL API
- [ ] Add session status management
- [ ] Connect to user and tutor services
- [ ] Test complete booking flow

### Phase 4: Communication & Reviews (Week 4)
**Goal**: Enable video sessions and basic feedback

#### Day 1-2: Video Communication
- [ ] Integrate video calling (Twilio/Agora)
- [ ] Create session room management
- [ ] Add basic recording capabilities
- [ ] Test video quality

#### Day 3-4: Reviews System
- [ ] Create review domain and API
- [ ] Implement rating calculations
- [ ] Add review moderation
- [ ] Connect reviews to tutor profiles

#### Day 5: Notifications & MVP Polish
- [ ] Setup email notifications
- [ ] Add SMS notifications for urgent events
- [ ] Final integration testing
- [ ] MVP deployment preparation

## 📋 MVP Feature Scope

### Core Features (Must Have)
1. **User Management**
   - Student and tutor registration
   - Profile management
   - Basic authentication

2. **Tutor Discovery**
   - Search tutors by subject
   - Filter by price, rating, availability
   - View tutor profiles and reviews

3. **Session Booking**
   - Book 1-on-1 tutoring sessions
   - Payment processing
   - Basic scheduling

4. **Video Sessions**
   - In-browser video calling
   - Session recording (basic)
   - Screen sharing

5. **Reviews & Ratings**
   - Rate tutors after sessions
   - Leave text reviews
   - Display ratings on profiles

6. **Notifications**
   - Email confirmations
   - Session reminders
   - Booking notifications

### Features NOT in MVP (Future)
- Advanced matching algorithms
- Group sessions
- Course creation
- Advanced analytics
- Mobile apps
- Advanced reporting
- Multi-language support
- Advanced payment features
- AI-powered recommendations

## 🏗️ Technical Architecture (MVP)

### Services (Minimal Set)
1. **user-service**: User management and authentication
2. **tutor-matching-service**: Tutor search and profiles
3. **booking-service**: Session scheduling and payments
4. **communication-service**: Video calling integration
5. **review-service**: Ratings and reviews
6. **notification-service**: Email/SMS notifications

### Infrastructure (Simplified)
- **Database**: PostgreSQL for all services (no Neo4j for MVP)
- **Authentication**: AWS Cognito only
- **Payments**: Stripe integration
- **Video**: Twilio Video API
- **Notifications**: AWS SES + SNS
- **Deployment**: AWS Fargate containers
- **API**: GraphQL Federation Gateway

### Development Priorities
1. **Speed over perfection**: Get working features quickly
2. **Monolithic deployment**: Single deployment unit initially
3. **Minimal infrastructure**: Use managed services where possible
4. **Manual testing**: Focus on core user journeys
5. **Documentation**: Keep it minimal and practical

## 📈 Success Metrics for MVP

### Technical Metrics
- [ ] All 6 core services deployed and functional
- [ ] GraphQL federation working across all services
- [ ] End-to-end user journey working (signup → find tutor → book → session → review)
- [ ] Payment processing working reliably
- [ ] Video calling functional with acceptable quality

### Business Metrics
- [ ] Students can successfully find tutors
- [ ] Booking completion rate > 80%
- [ ] Session completion rate > 90%
- [ ] Payment success rate > 95%
- [ ] Average session rating > 4.0

## 🚨 Risk Mitigation

### Technical Risks
1. **Video calling complexity**: Use proven service (Twilio)
2. **Payment processing**: Use Stripe, not custom solution
3. **Service integration**: Start with simple REST, add GraphQL gradually
4. **Database performance**: Use PostgreSQL with proper indexing

### Business Risks
1. **Feature creep**: Stick to MVP scope strictly
2. **Over-engineering**: Use simple solutions that work
3. **Integration complexity**: Test integrations early and often

## 📅 Timeline Summary
- **Week 1**: Complete User Service + GraphQL Federation
- **Week 2**: Tutor Matching Service
- **Week 3**: Session Booking + Payments
- **Week 4**: Communication + Reviews + MVP Launch

**Total Timeline: 4 weeks to MVP**

## 🎯 Next Immediate Actions
1. Connect User Service to GraphQL Federation Gateway
2. Test end-to-end GraphQL integration
3. Delete redundant documentation files
4. Create service implementation template
5. Begin Tutor Matching Service implementation

---

**Focus**: Build working software quickly. Perfect it later.