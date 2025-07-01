import { Logger } from "@nestjs/common";

export enum NotificationType {
  EMAIL_MARKETING = "email_marketing",
  EMAIL_SYSTEM = "email_system",
  PUSH_NOTIFICATIONS = "push_notifications",
  SMS_NOTIFICATIONS = "sms_notifications",
  COURSE_UPDATES = "course_updates",
  SESSION_REMINDERS = "session_reminders",
  PAYMENT_ALERTS = "payment_alerts",
  SECURITY_ALERTS = "security_alerts",
}

export enum Language {
  ENGLISH = "en",
  SPANISH = "es",
  FRENCH = "fr",
  GERMAN = "de",
  ITALIAN = "it",
  PORTUGUESE = "pt",
  CHINESE = "zh",
  JAPANESE = "ja",
  KOREAN = "ko",
  UKRAINIAN = "ua",
}

export interface NotificationSettings {
  [NotificationType.EMAIL_MARKETING]: boolean;
  [NotificationType.EMAIL_SYSTEM]: boolean;
  [NotificationType.PUSH_NOTIFICATIONS]: boolean;
  [NotificationType.SMS_NOTIFICATIONS]: boolean;
  [NotificationType.COURSE_UPDATES]: boolean;
  [NotificationType.SESSION_REMINDERS]: boolean;
  [NotificationType.PAYMENT_ALERTS]: boolean;
  [NotificationType.SECURITY_ALERTS]: boolean;
}

export interface UserPreferencesData {
  timezone: string;
  language: Language;
  notificationSettings: NotificationSettings;
  theme?: "light" | "dark" | "system";
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  timeFormat?: "12h" | "24h";
}

/**
 * UserPreferences Value Object
 *
 * Focuses on:
 * - User preference data integrity
 * - Basic preference operations
 * - Notification setting management
 *
 * Complex business logic is delegated to UserDomainService
 */
export class UserPreferences {
  private readonly logger = new Logger(UserPreferences.name);

  private constructor(
    private readonly _timezone: string,
    private readonly _language: Language,
    private readonly _notificationSettings: NotificationSettings,
    private readonly _theme: "light" | "dark" | "system" = "system",
    private readonly _dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" = "MM/DD/YYYY",
    private readonly _timeFormat: "12h" | "24h" = "12h",
  ) {}

  /**
   * Creates UserPreferences with validation
   */
  static create(data: UserPreferencesData): UserPreferences {
    this.validateTimezone(data.timezone);
    this.validateNotificationSettings(data.notificationSettings);

    return new UserPreferences(
      data.timezone,
      data.language,
      data.notificationSettings,
      data.theme || "system",
      data.dateFormat || "MM/DD/YYYY",
      data.timeFormat || "12h",
    );
  }

  /**
   * Creates default user preferences
   */
  static createDefault(
    timezone: string = "UTC",
    language: Language = Language.ENGLISH,
  ): UserPreferences {
    const defaultNotificationSettings: NotificationSettings = {
      [NotificationType.EMAIL_MARKETING]: false,
      [NotificationType.EMAIL_SYSTEM]: true,
      [NotificationType.PUSH_NOTIFICATIONS]: true,
      [NotificationType.SMS_NOTIFICATIONS]: false,
      [NotificationType.COURSE_UPDATES]: true,
      [NotificationType.SESSION_REMINDERS]: true,
      [NotificationType.PAYMENT_ALERTS]: true,
      [NotificationType.SECURITY_ALERTS]: true,
    };

    return new UserPreferences(timezone, language, defaultNotificationSettings);
  }

  /**
   * Gets notification setting for a specific type
   */
  getNotificationSetting(type: NotificationType): boolean {
    return this._notificationSettings[type];
  }

  /**
   * Updates notification setting for a specific type
   */
  updateNotificationSetting(type: NotificationType, enabled: boolean): UserPreferences {
    // Prevent disabling mandatory notifications
    if (
      (type === NotificationType.SECURITY_ALERTS || type === NotificationType.EMAIL_SYSTEM) &&
      !enabled
    ) {
      this.logger.warn(`Attempted to disable mandatory notification type: ${type}`);
      throw new Error(
        `Cannot disable ${type} notifications - they are required for account security`,
      );
    }

    const newSettings = {
      ...this._notificationSettings,
      [type]: enabled,
    };

    return new UserPreferences(
      this._timezone,
      this._language,
      newSettings,
      this._theme,
      this._dateFormat,
      this._timeFormat,
    );
  }

  /**
   * Updates language preference
   */
  updateLanguage(language: Language): UserPreferences {
    return new UserPreferences(
      this._timezone,
      language,
      this._notificationSettings,
      this._theme,
      this._dateFormat,
      this._timeFormat,
    );
  }

  /**
   * Updates timezone with validation
   */
  updateTimezone(timezone: string): UserPreferences {
    this.logger.debug(`Updating timezone to: ${timezone}`);

    UserPreferences.validateTimezone(timezone);

    // Create new instance with updated timezone
    return new UserPreferences(
      timezone.trim(),
      this._language,
      this._notificationSettings,
      this._theme,
      this._dateFormat,
      this._timeFormat,
    );
  }

  /**
   * Updates display preferences
   */
  updateDisplayPreferences(
    theme?: "light" | "dark" | "system",
    dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD",
    timeFormat?: "12h" | "24h",
  ): UserPreferences {
    return new UserPreferences(
      this._timezone,
      this._language,
      this._notificationSettings,
      theme || this._theme,
      dateFormat || this._dateFormat,
      timeFormat || this._timeFormat,
    );
  }

  /**
   * Gets count of enabled notifications
   */
  getEnabledNotificationCount(): number {
    return Object.values(this._notificationSettings).filter((enabled) => enabled).length;
  }

  /**
   * Checks if user has minimal notification settings
   */
  hasMinimalNotifications(): boolean {
    // At minimum, users must have system emails and security alerts
    return (
      this._notificationSettings[NotificationType.EMAIL_SYSTEM] &&
      this._notificationSettings[NotificationType.SECURITY_ALERTS]
    );
  }

  /**
   * Formats date according to user preference
   */
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    switch (this._dateFormat) {
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "MM/DD/YYYY":
      default:
        return `${month}/${day}/${year}`;
    }
  }

  /**
   * Formats time according to user preference
   */
  formatTime(date: Date): string {
    if (this._timeFormat === "24h") {
      return date.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Getters
  get timezone(): string {
    return this._timezone;
  }
  get language(): Language {
    return this._language;
  }
  get notificationSettings(): NotificationSettings {
    return { ...this._notificationSettings };
  }
  get theme(): "light" | "dark" | "system" {
    return this._theme;
  }
  get dateFormat(): "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" {
    return this._dateFormat;
  }
  get timeFormat(): "12h" | "24h" {
    return this._timeFormat;
  }

  /**
   * Converts to persistence format
   */
  toPersistence(): UserPreferencesData {
    return {
      timezone: this._timezone,
      language: this._language,
      notificationSettings: this._notificationSettings,
      theme: this._theme,
      dateFormat: this._dateFormat,
      timeFormat: this._timeFormat,
    };
  }

  /**
   * Creates from persistence data
   */
  static fromPersistence(data: UserPreferencesData): UserPreferences {
    return UserPreferences.create(data);
  }

  /**
   * Validates timezone using IANA timezone database format
   */
  private static validateTimezone(timezone: string): void {
    if (!timezone || typeof timezone !== "string") {
      throw new Error("Timezone must be a valid string");
    }

    // For now, allow any string that looks like a timezone
    if (!/^[A-Za-z_/]+$/.test(timezone)) {
      throw new Error("Invalid timezone format");
    }
  }

  /**
   * Validates notification settings structure
   */
  private static validateNotificationSettings(settings: NotificationSettings): void {
    const requiredTypes = Object.values(NotificationType);

    for (const type of requiredTypes) {
      if (!(type in settings)) {
        throw new Error(`Missing notification setting for ${type}`);
      }

      if (typeof settings[type] !== "boolean") {
        throw new Error(`Notification setting for ${type} must be boolean`);
      }
    }
  }

  /**
   * Equality comparison
   */
  equals(other: UserPreferences): boolean {
    if (!other) return false;

    return (
      this._timezone === other._timezone &&
      this._language === other._language &&
      this._theme === other._theme &&
      this._dateFormat === other._dateFormat &&
      this._timeFormat === other._timeFormat &&
      JSON.stringify(this._notificationSettings) === JSON.stringify(other._notificationSettings)
    );
  }

  /**
   * String representation
   */
  toString(): string {
    return (
      `UserPreferences(timezone=${this._timezone}, language=${this._language}, ` +
      `notifications=${this.getEnabledNotificationCount()}/8, theme=${this._theme})`
    );
  }
}
