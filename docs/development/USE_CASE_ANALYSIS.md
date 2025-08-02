# Use Case Analysis and Consistency Report

## Overview

This document analyzes all use cases across the microservices architecture for inconsistencies, duplication, and patterns that need standardization.

## Current Use Cases Inventory

### User Service
1. **CreateUserUseCase** (DUPLICATE - 2 versions)
   - `/apps/user-service/src/application/use-cases/create-user.usecase.ts` (New, simplified)
   - `/apps/user-service/src/application/use-cases/create-user/create-user.usecase.ts` (Legacy, complex)

2. **BecomeTutorUseCase**
   - `/apps/user-service/src/application/use-cases/become-tutor/become-tutor.usecase.ts`

3. **UpdateUserProfileUseCase**
   - `/apps/user-service/src/application/use-cases/update-user-profile/update-user-profile.usecase.ts`

### Tutor Matching Service
1. **CreateTutorUseCase**
   - `/apps/tutor-matching-service/src/application/use-cases/create-tutor.usecase.ts`

2. **CreateMatchingRequestUseCase**
   - `/apps/tutor-matching-service/src/application/use-cases/create-matching-request.usecase.ts`

## Identified Issues

### 1. Duplicate Use Cases
**Problem**: Two different implementations of `CreateUserUseCase`
- **Legacy version**: Uses symbol-based DI tokens, complex event handling with `getUncommittedEvents()`
- **New version**: Uses string-based DI tokens, simplified event handling with `commit()`

**Impact**: Confusion, inconsistent behavior, maintenance burden

**Recommendation**: Remove legacy version, use new simplified version

### 2. Inconsistent Dependency Injection Patterns

**User Service Issues**:
- **Legacy use cases** use `USER_SERVICE_TOKENS` (symbols)
- **New use cases** use `DI_TOKENS` (strings)
- Mixed usage patterns create confusion

**Tutor Matching Service**:
- Consistently uses string-based DI tokens (good)

### 3. Inconsistent Event Handling Patterns

**Pattern 1 (Legacy)**:
```typescript
user.getUncommittedEvents().forEach((event) => {
  this.eventBus.publish(event);
});
```

**Pattern 2 (New)**:
```typescript
user.commit();
```

**Issue**: Two different ways to handle domain events

### 4. Inconsistent Error Handling

**Pattern 1**: Throwing generic `Error` objects
```typescript
throw new Error("User with this email already exists");
```

**Pattern 2**: Should use domain-specific errors from constants
```typescript
throw new UserError(USER_ERRORS.USER_ALREADY_EXISTS);
```

### 5. Inconsistent Response Patterns

**Some use cases** return domain entities directly:
```typescript
return user; // Domain entity
```

**Others** return DTOs:
```typescript
return {
  userId: user.id,
  email: user.email,
  // ... mapped fields
};
```

### 6. Business Logic Duplication

**CreateUserUseCase vs CreateTutorUseCase**:
- Both create entities with similar validation
- Could share common validation patterns
- Similar event publishing logic

**BecomeTutorUseCase vs CreateTutorUseCase**:
- Overlap in tutor-related logic
- Potential for shared business rules

## Standardization Plan

### Phase 1: Remove Duplicates
1. ✅ **Remove legacy CreateUserUseCase** in subfolder
2. ✅ **Update all imports** to use root-level use cases
3. ✅ **Standardize on string-based DI tokens**

### Phase 2: Standardize Patterns

#### A. Event Handling Pattern
**Standard**: Use `entity.commit()` method
```typescript
// Persist to repository
await this.repository.save(entity);

// Publish domain events
entity.commit();
```

#### B. Error Handling Pattern
**Standard**: Use domain-specific errors from constants
```typescript
import { USER_ERRORS } from '../../constants';

if (existingUser) {
  throw new DomainError(USER_ERRORS.USER_ALREADY_EXISTS);
}
```

#### C. Dependency Injection Pattern
**Standard**: Use string-based tokens from constants
```typescript
constructor(
  @Inject(DI_TOKENS.USER_REPOSITORY)
  private readonly userRepository: IUserRepository,
  private readonly eventBus: EventBus,
) {}
```

#### D. Response Pattern
**Standard**: Return domain entities from use cases, let resolvers/controllers handle mapping
```typescript
async execute(dto: CreateUserRequestDto): Promise<User> {
  // ... business logic
  return user; // Return domain entity
}
```

### Phase 3: Extract Common Patterns

#### A. Base Use Case Class
```typescript
export abstract class BaseUseCase<TRequest, TResponse> implements IUseCase<TRequest, TResponse> {
  abstract execute(request: TRequest): Promise<TResponse>;
  
  protected async publishEvents(entity: AggregateRoot): Promise<void> {
    entity.commit();
  }
  
  protected handleError(error: any, context: string): never {
    // Standardized error handling
    throw new DomainError(`${context}: ${error.message}`);
  }
}
```

#### B. Repository Base Pattern
```typescript
export abstract class BaseRepository<TEntity extends AggregateRoot> {
  abstract save(entity: TEntity): Promise<TEntity>;
  abstract findById(id: string): Promise<TEntity | null>;
  
  protected mapToDomainEntity(dbEntity: any): TEntity {
    // Common mapping logic using mergeObjectContext
    const entity = new (this.getEntityClass())();
    entity.mergeObjectContext(dbEntity);
    return entity;
  }
  
  protected abstract getEntityClass(): new() => TEntity;
}
```

## Implementation Priority

### High Priority (Current Tasks)
1. ✅ Remove duplicate CreateUserUseCase
2. ✅ Standardize DI token usage
3. ✅ Update all use cases to use new patterns

### Medium Priority (Next Sprint)
1. Implement standardized error handling
2. Create base use case class
3. Extract common validation patterns

### Low Priority (Future)
1. Implement base repository pattern
2. Add comprehensive use case testing
3. Create use case documentation templates

## Metrics

### Before Standardization
- **Duplicate use cases**: 1 (CreateUserUseCase)
- **Inconsistent DI patterns**: 3 use cases using symbols
- **Inconsistent event handling**: 3 use cases using legacy pattern
- **Error handling inconsistency**: 100% of use cases

### After Standardization (Target)
- **Duplicate use cases**: 0
- **Consistent DI patterns**: 100%
- **Consistent event handling**: 100%
- **Standardized error handling**: 100%

## Conclusion

The analysis reveals several critical inconsistencies that impact maintainability and developer experience. The standardization plan addresses these issues systematically, prioritizing the most impactful changes first.

Key benefits of standardization:
- **Reduced cognitive load** for developers
- **Improved maintainability** through consistent patterns
- **Better testability** with standardized interfaces
- **Enhanced code reusability** through common patterns