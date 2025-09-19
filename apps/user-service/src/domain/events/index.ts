// Simplified Domain Events
export { BaseDomainEvent } from "./base-domain.event";

// User Lifecycle Events
export { UserActivatedEvent } from "./user-activated.event";
export { UserCreatedEvent, UserCreatedPayload } from "./user-created.event";
export { UserDeactivatedEvent } from "./user-deactivated.event";
export { UserUpdatedEvent } from "./user-updated.event";

// Advanced User Events
export { UserLoginAttemptedEvent, UserLoginAttemptedPayload } from "./user-login-attempted.event";
export {
  PreferenceChange,
  UserPreferencesChangedEvent,
  UserPreferencesChangedPayload,
} from "./user-preferences-changed.event";
export {
  ProfileChange,
  UserProfileUpdatedEvent,
  UserProfileUpdatedPayload,
} from "./user-profile-updated.event";
export { UserRoleChangedEvent, UserRoleChangedPayload } from "./user-role-changed.event";
