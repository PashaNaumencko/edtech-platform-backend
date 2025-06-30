import {
    ExperienceLevel,
    Skill,
    SkillCategory,
    UserProfile
} from './user-profile.value-object';

describe('UserProfile', () => {
  describe('create', () => {
    it('should create profile with valid data', () => {
      const skills: Skill[] = [
        { name: 'JavaScript', category: SkillCategory.PROGRAMMING, level: ExperienceLevel.ADVANCED }
      ];

      const data = {
        bio: 'Experienced developer',
        skills,
        experienceLevel: ExperienceLevel.ADVANCED,
        dateOfBirth: new Date('1990-05-15')
      };

      const profile = UserProfile.create(data);

      expect(profile.bio).toBe('Experienced developer');
      expect(profile.skills).toEqual(skills);
      expect(profile.experienceLevel).toBe(ExperienceLevel.ADVANCED);
    });

    it('should create minimal profile', () => {
      const profile = UserProfile.createMinimal();

      expect(profile.bio).toBeNull();
      expect(profile.skills).toEqual([]);
      expect(profile.experienceLevel).toBe(ExperienceLevel.BEGINNER);
    });
  });

  describe('age calculation', () => {
    it('should calculate age correctly', () => {
      const birthYear = new Date().getFullYear() - 25;
      const profile = UserProfile.create({
        skills: [],
        experienceLevel: ExperienceLevel.BEGINNER,
        dateOfBirth: new Date(`${birthYear}-06-15`)
      });

      expect(profile.age).toBe(25);
    });

    it('should return null when no date of birth', () => {
      const profile = UserProfile.createMinimal();

      expect(profile.age).toBeNull();
    });
  });

  describe('skill management', () => {
    it('should check if user has skill', () => {
      const profile = UserProfile.create({
        skills: [
          { name: 'JavaScript', category: SkillCategory.PROGRAMMING, level: ExperienceLevel.ADVANCED }
        ],
        experienceLevel: ExperienceLevel.INTERMEDIATE
      });

      expect(profile.hasSkill('JavaScript')).toBe(true);
      expect(profile.hasSkill('Python')).toBe(false);
    });

    it('should add new skill', () => {
      const profile = UserProfile.createMinimal();
      const newSkill: Skill = {
        name: 'Python',
        category: SkillCategory.PROGRAMMING,
        level: ExperienceLevel.INTERMEDIATE
      };

      const updatedProfile = profile.addSkill(newSkill);

      expect(updatedProfile.hasSkill('Python')).toBe(true);
      expect(profile.hasSkill('Python')).toBe(false); // Original unchanged
    });
  });

  describe('profile completeness', () => {
    it('should calculate completeness', () => {
      const profile = UserProfile.createMinimal();
      expect(profile.calculateCompleteness()).toBeGreaterThanOrEqual(0);
    });

    it('should check tutoring eligibility', () => {
      const profile = UserProfile.createMinimal();
      expect(typeof profile.isCompleteForTutoring()).toBe('boolean');
    });
  });

  describe('persistence', () => {
    it('should convert to and from persistence format', () => {
      const originalData = {
        bio: 'Test bio',
        skills: [
          { name: 'JavaScript', category: SkillCategory.PROGRAMMING, level: ExperienceLevel.ADVANCED }
        ],
        experienceLevel: ExperienceLevel.INTERMEDIATE
      };

      const profile = UserProfile.create(originalData);
      const persistenceData = profile.toPersistence();
      const recreatedProfile = UserProfile.fromPersistence(persistenceData);

      expect(recreatedProfile.equals(profile)).toBe(true);
    });
  });
});
