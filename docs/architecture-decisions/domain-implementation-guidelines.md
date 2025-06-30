# Domain Implementation Guidelines

## 🎯 Quick Decision Framework

### **Step 1: Assess Service Complexity**

Ask these questions for each new service:

1. **Business Logic Complexity**
   - ❓ More than 5 business rules? → Medium/Complex
   - ❓ Simple CRUD operations only? → Simple

2. **Entity Relationships**
   - ❓ Single aggregate? → Simple
   - ❓ 2-3 related aggregates? → Medium
   - ❓ 4+ complex relationships? → Complex

3. **Business Rules**
   - ❓ Static validation only? → Simple
   - ❓ Cross-entity orchestration? → Medium
   - ❓ Complex policies/calculations? → Complex

### **Step 2: Apply Appropriate Pattern Level**

## 🟢 **Simple Service Template**

```typescript
// Notification Service Example
domain/
├── entities/
│   └── notification.entity.ts     // Basic AggregateRoot
├── value-objects/
│   ├── notification-id.ts         // Essential IDs only
│   └── notification-status.ts     // Core statuses
├── rules/
│   └── notification-rules.ts      // Static validation methods
└── specifications/
    └── notification.specs.ts      // 3-5 basic queries

// NO domain services, NO complex events, NO factories
```

**Use When**:
- ✅ Simple CRUD operations
- ✅ Minimal business logic
- ✅ Single aggregate focus
- ✅ Basic validation needs

## 🟡 **Medium Service Template**

```typescript
// Reviews Service Example
domain/
├── entities/
│   ├── review.entity.ts           // Rich aggregate
│   └── review-summary.entity.ts   // Related aggregate
├── value-objects/
│   ├── review-id.ts
│   ├── rating.ts                  // Business concept
│   └── review-content.ts          // Rich value object
├── rules/
│   └── review-rules.ts            // Class-based policies
├── services/
│   └── review-domain.service.ts   // 1 focused orchestrator
└── specifications/
    └── review.specs.ts            // 5-8 business queries

// Selective complexity where justified
```

**Use When**:
- ✅ Moderate business logic
- ✅ 2-3 related entities
- ✅ Some orchestration needed
- ✅ Business-focused queries

## 🔴 **Complex Service Template**

```typescript
// User Service (CURRENT) / Learning Service Example
domain/
├── entities/                      // 2-4 rich aggregates
├── value-objects/                 // 4-8 business concepts
├── events/                        // 4-8 domain events
├── rules/                         // Complex business policies
├── services/                      // 1-2 orchestration services
├── specifications/                // 10-15 comprehensive queries
├── errors/                        // 8-12 specialized errors
└── factories/                     // Complex object creation

// Full enterprise DDD patterns
```

**Use When**:
- ✅ Rich business logic
- ✅ Complex entity relationships
- ✅ Multiple orchestration needs
- ✅ Comprehensive querying

## 🔧 **Progressive Enhancement Strategy**

### **Start Simple, Grow Complexity**

1. **Phase 1**: Always start with Simple template
2. **Phase 2**: Add patterns as business complexity emerges
3. **Phase 3**: Promote to higher complexity tier when justified

### **Example Evolution: Reviews Service**

```typescript
// DAY 1: Start Simple
domain/
├── entities/review.entity.ts       // Basic review
└── rules/review-rules.ts           // Static validation

// DAY 5: Business complexity emerges
domain/
├── entities/
│   ├── review.entity.ts           // Enhanced
│   └── review-summary.entity.ts   // NEW: Aggregation needed
├── services/
│   └── review-domain.service.ts   // NEW: Orchestration needed
└── specifications/
    └── review.specs.ts            // NEW: Complex queries needed

// Promotion to Medium complexity justified
```

## 📦 **Shared Libraries Usage**

### **@edtech/domain (REQUIRED for all services)**
```typescript
// Always use shared base classes
import { Specification } from '@edtech/domain/specifications';
import { AggregateRoot } from '@edtech/domain/base-entity';
import { ValueObject } from '@edtech/domain/value-object';
```

### **@edtech/types (REQUIRED for all services)**
```typescript
// Always use shared interfaces
import { IUseCase, IRepository } from '@edtech/types';
```

### **Service-Specific Specifications**
```typescript
// Use shared base + service-specific implementations
export class ActiveNotificationSpec extends Specification<Notification> {
  isSatisfiedBy(notification: Notification): boolean {
    return notification.status === NotificationStatus.ACTIVE;
  }
}
```

## ✅ **Quality Gates**

### **Before Implementing Domain Service**
- [ ] Do you have 3+ entities needing orchestration?
- [ ] Are there complex business calculations?
- [ ] Do you need cross-aggregate validation?

**If NO to all** → Skip domain services

### **Before Implementing Specifications**
- [ ] Do you need more than basic CRUD queries?
- [ ] Are there complex filtering requirements?
- [ ] Do you need composable query logic?

**If NO to all** → Use simple repository methods

### **Before Implementing Rich Events**
- [ ] Do downstream services need rich context?
- [ ] Are there complex side effects?
- [ ] Do you need event sourcing?

**If NO to all** → Use basic domain events

## 🎯 **Success Metrics**

### **Simple Services**
- ✅ 5-10 TypeScript files
- ✅ 200-500 lines of code
- ✅ 1-2 hour implementation

### **Medium Services**
- ✅ 15-20 TypeScript files
- ✅ 800-1200 lines of code
- ✅ 1-2 day implementation

### **Complex Services**
- ✅ 25-35 TypeScript files
- ✅ 2000+ lines of code
- ✅ 4-5 day implementation

This progressive approach ensures we **build exactly the complexity we need** without over-engineering simpler services.
