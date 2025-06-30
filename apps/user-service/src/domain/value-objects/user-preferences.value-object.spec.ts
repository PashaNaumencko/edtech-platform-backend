import { Language, NotificationType, UserPreferences } from './user-preferences.value-object';

describe('UserPreferences', () => {
  describe('create', () => {
    it('should create preferences with valid data', () => {
      const data = {
        timezone: 'America/New_York',
        language: Language.ENGLISH,
        notificationSettings: {
          [NotificationType.EMAIL_MARKETING]: false,
          [NotificationType.EMAIL_SYSTEM]: true,
          [NotificationType.PUSH_NOTIFICATIONS]: true,
          [NotificationType.SMS_NOTIFICATIONS]: false,
          [NotificationType.COURSE_UPDATES]: true,
          [NotificationType.SESSION_REMINDERS]: true,
          [NotificationType.PAYMENT_ALERTS]: true,
          [NotificationType.SECURITY_ALERTS]: true
        }
      };

      const preferences = UserPreferences.create(data);

      expect(preferences.timezone).toBe('America/New_York');
      expect(preferences.language).toBe(Language.ENGLISH);
      expect(preferences.shouldReceiveNotification(NotificationType.EMAIL_SYSTEM)).toBe(true);
      expect(preferences.shouldReceiveNotification(NotificationType.EMAIL_MARKETING)).toBe(false);
    });

    it('should throw error for invalid timezone', () => {
      const data = {
        timezone: 'Invalid/Timezone!',
        language: Language.ENGLISH,
        notificationSettings: {} as any
      };

      expect(() => UserPreferences.create(data)).toThrow('Invalid timezone format');
    });

    it('should throw error for missing notification settings', () => {
      const data = {
        timezone: 'UTC',
        language: Language.ENGLISH,
        notificationSettings: {
          [NotificationType.EMAIL_MARKETING]: false
        } as any
      };

      expect(() => UserPreferences.create(data)).toThrow('Missing notification setting');
    });
  });

  describe('createDefault', () => {
    it('should create default preferences', () => {
      const preferences = UserPreferences.createDefault();

      expect(preferences.timezone).toBe('UTC');
      expect(preferences.language).toBe(Language.ENGLISH);
      expect(preferences.shouldReceiveNotification(NotificationType.EMAIL_SYSTEM)).toBe(true);
      expect(preferences.shouldReceiveNotification(NotificationType.SECURITY_ALERTS)).toBe(true);
      expect(preferences.shouldReceiveNotification(NotificationType.EMAIL_MARKETING)).toBe(false);
    });

    it('should create default preferences with custom timezone and language', () => {
      const preferences = UserPreferences.createDefault('America/Los_Angeles', Language.SPANISH);

      expect(preferences.timezone).toBe('America/Los_Angeles');
      expect(preferences.language).toBe(Language.SPANISH);
    });
  });

  describe('shouldReceiveNotification', () => {
    let preferences: UserPreferences;

    beforeEach(() => {
      preferences = UserPreferences.createDefault();
    });

    it('should always return true for security alerts', () => {
      // Should throw error when trying to disable
      expect(() =>
        preferences.updateNotificationSetting(NotificationType.SECURITY_ALERTS, false)
      ).toThrow('Cannot disable security_alerts notifications');
    });

    it('should always return true for system emails', () => {
      expect(() =>
        preferences.updateNotificationSetting(NotificationType.EMAIL_SYSTEM, false)
      ).toThrow('Cannot disable email_system notifications');
    });

    it('should respect user preferences for optional notifications', () => {
      const updatedPreferences = preferences.updateNotificationSetting(
        NotificationType.EMAIL_MARKETING,
        true
      );

      expect(updatedPreferences.shouldReceiveNotification(NotificationType.EMAIL_MARKETING)).toBe(true);
      expect(preferences.shouldReceiveNotification(NotificationType.EMAIL_MARKETING)).toBe(false);
    });
  });

  describe('updateNotificationSetting', () => {
    let preferences: UserPreferences;

    beforeEach(() => {
      preferences = UserPreferences.createDefault();
    });

    it('should update optional notification setting', () => {
      const updatedPreferences = preferences.updateNotificationSetting(
        NotificationType.COURSE_UPDATES,
        false
      );

      expect(updatedPreferences.shouldReceiveNotification(NotificationType.COURSE_UPDATES)).toBe(false);
      expect(preferences.shouldReceiveNotification(NotificationType.COURSE_UPDATES)).toBe(true);
    });

    it('should throw error when disabling mandatory notifications', () => {
      expect(() =>
        preferences.updateNotificationSetting(NotificationType.SECURITY_ALERTS, false)
      ).toThrow('Cannot disable security_alerts notifications');

      expect(() =>
        preferences.updateNotificationSetting(NotificationType.EMAIL_SYSTEM, false)
      ).toThrow('Cannot disable email_system notifications');
    });
  });

  describe('updateLanguage', () => {
    it('should update language preference', () => {
      const preferences = UserPreferences.createDefault();
      const updatedPreferences = preferences.updateLanguage(Language.FRENCH);

      expect(updatedPreferences.language).toBe(Language.FRENCH);
      expect(preferences.language).toBe(Language.ENGLISH);
    });
  });

  describe('updateTimezone', () => {
    it('should update timezone preference', () => {
      const preferences = UserPreferences.createDefault();
      const updatedPreferences = preferences.updateTimezone('Europe/London');

      expect(updatedPreferences.timezone).toBe('Europe/London');
      expect(preferences.timezone).toBe('UTC');
    });

    it('should validate timezone format', () => {
      const preferences = UserPreferences.createDefault();

      expect(() => preferences.updateTimezone('Invalid!')).toThrow('Invalid timezone format');
    });
  });

  describe('formatDate', () => {
    it('should format date according to user preference', () => {
      const date = new Date('2024-03-15');

      let preferences = UserPreferences.createDefault();
      expect(preferences.formatDate(date)).toBe('03/15/2024');

      preferences = preferences.updateDisplayPreferences('light', 'DD/MM/YYYY');
      expect(preferences.formatDate(date)).toBe('15/03/2024');

      preferences = preferences.updateDisplayPreferences('light', 'YYYY-MM-DD');
      expect(preferences.formatDate(date)).toBe('2024-03-15');
    });
  });

  describe('formatTime', () => {
    it('should format time according to user preference', () => {
      const date = new Date('2024-03-15T14:30:00');

      let preferences = UserPreferences.createDefault();
      expect(preferences.formatTime(date)).toMatch(/2:30 PM/);

      preferences = preferences.updateDisplayPreferences('light', 'MM/DD/YYYY', '24h');
      expect(preferences.formatTime(date)).toBe('14:30');
    });
  });

  describe('getEnabledNotificationCount', () => {
    it('should count enabled notifications', () => {
      const preferences = UserPreferences.createDefault();

      // Default has EMAIL_SYSTEM, PUSH_NOTIFICATIONS, COURSE_UPDATES, SESSION_REMINDERS, PAYMENT_ALERTS, SECURITY_ALERTS enabled
      expect(preferences.getEnabledNotificationCount()).toBe(6);
    });
  });

  describe('hasMinimalNotifications', () => {
    it('should return true when mandatory notifications are enabled', () => {
      const preferences = UserPreferences.createDefault();

      expect(preferences.hasMinimalNotifications()).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should convert to and from persistence format', () => {
      const originalData = {
        timezone: 'America/New_York',
        language: Language.SPANISH,
        notificationSettings: {
          [NotificationType.EMAIL_MARKETING]: true,
          [NotificationType.EMAIL_SYSTEM]: true,
          [NotificationType.PUSH_NOTIFICATIONS]: false,
          [NotificationType.SMS_NOTIFICATIONS]: true,
          [NotificationType.COURSE_UPDATES]: false,
          [NotificationType.SESSION_REMINDERS]: true,
          [NotificationType.PAYMENT_ALERTS]: true,
          [NotificationType.SECURITY_ALERTS]: true
        },
        theme: 'dark' as const,
        dateFormat: 'DD/MM/YYYY' as const,
        timeFormat: '24h' as const
      };

      const preferences = UserPreferences.create(originalData);
      const persistenceData = preferences.toPersistence();
      const recreatedPreferences = UserPreferences.fromPersistence(persistenceData);

      expect(recreatedPreferences.equals(preferences)).toBe(true);
      expect(recreatedPreferences.timezone).toBe(originalData.timezone);
      expect(recreatedPreferences.language).toBe(originalData.language);
      expect(recreatedPreferences.theme).toBe(originalData.theme);
    });
  });

  describe('equals', () => {
    it('should return true for equal preferences', () => {
      const preferences1 = UserPreferences.createDefault();
      const preferences2 = UserPreferences.createDefault();

      expect(preferences1.equals(preferences2)).toBe(true);
    });

    it('should return false for different preferences', () => {
      const preferences1 = UserPreferences.createDefault();
      const preferences2 = preferences1.updateLanguage(Language.FRENCH);

      expect(preferences1.equals(preferences2)).toBe(false);
    });

    it('should return false for null input', () => {
      const preferences = UserPreferences.createDefault();

      expect(preferences.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide meaningful string representation', () => {
      const preferences = UserPreferences.createDefault();
      const string = preferences.toString();

      expect(string).toContain('UserPreferences');
      expect(string).toContain('timezone=UTC');
      expect(string).toContain('language=en');
      expect(string).toContain('notifications=6/8');
    });
  });
});
