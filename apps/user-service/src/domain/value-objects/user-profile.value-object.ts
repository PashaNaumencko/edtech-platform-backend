import { Logger } from "@nestjs/common";

export enum ExperienceLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

export enum SkillCategory {
  PROGRAMMING = "programming",
  LANGUAGES = "languages",
  MATHEMATICS = "mathematics",
  SCIENCE = "science",
  BUSINESS = "business",
  ARTS = "arts",
  MUSIC = "music",
  SPORTS = "sports",
  OTHER = "other",
}

export interface Skill {
  name: string;
  category: SkillCategory;
  level: ExperienceLevel;
  yearsOfExperience?: number;
  certifications?: string[];
}

export interface UserProfileData {
  bio?: string;
  skills: Skill[];
  experienceLevel: ExperienceLevel;
  dateOfBirth?: Date;
  location?: string;
  website?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  education?: EducationEntry[];
  achievements?: Achievement[];
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: Date;
  endDate?: Date;
  isCurrentlyEnrolled?: boolean;
}

export interface Achievement {
  title: string;
  description?: string;
  dateAchieved?: Date;
  category?: string;
  verificationUrl?: string;
}

/**
 * UserProfile Value Object
 *
 * Focuses on:
 * - Data integrity and validation
 * - Basic profile calculations
 * - Immutable profile operations
 *
 * Business logic is delegated to UserDomainService
 */
export class UserProfile {
  private readonly logger = new Logger(UserProfile.name);

  private constructor(
    private readonly _bio: string | null,
    private readonly _skills: Skill[],
    private readonly _experienceLevel: ExperienceLevel,
    private readonly _dateOfBirth: Date | null,
    private readonly _location: string | null,
    private readonly _website: string | null,
    private readonly _linkedInUrl: string | null,
    private readonly _githubUrl: string | null,
    private readonly _education: EducationEntry[],
    private readonly _achievements: Achievement[],
  ) {}

  /**
   * Creates UserProfile with validation
   */
  static create(data: UserProfileData): UserProfile {
    this.validateBio(data.bio);
    this.validateSkills(data.skills);
    this.validateDateOfBirth(data.dateOfBirth);
    this.validateUrls(data.website, data.linkedInUrl, data.githubUrl);

    return new UserProfile(
      data.bio || null,
      data.skills || [],
      data.experienceLevel,
      data.dateOfBirth || null,
      data.location || null,
      data.website || null,
      data.linkedInUrl || null,
      data.githubUrl || null,
      data.education || [],
      data.achievements || [],
    );
  }

  /**
   * Creates minimal profile for new users
   */
  static createMinimal(experienceLevel: ExperienceLevel = ExperienceLevel.BEGINNER): UserProfile {
    return new UserProfile(null, [], experienceLevel, null, null, null, null, null, [], []);
  }

  /**
   * Gets user's current age (if date of birth is set)
   */
  get age(): number | null {
    if (!this._dateOfBirth) {
      return null;
    }

    const today = new Date();
    const birthDate = new Date(this._dateOfBirth);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Checks if user has a specific skill
   */
  hasSkill(skillName: string): boolean {
    return this._skills.some((skill) => skill.name.toLowerCase() === skillName.toLowerCase());
  }

  /**
   * Gets skills by category
   */
  getSkillsByCategory(category: SkillCategory): Skill[] {
    return this._skills.filter((skill) => skill.category === category);
  }

  /**
   * Gets skills by experience level
   */
  getSkillsByLevel(level: ExperienceLevel): Skill[] {
    return this._skills.filter((skill) => skill.level === level);
  }

  /**
   * Gets highest skill level in any category
   */
  getHighestSkillLevel(): ExperienceLevel {
    if (this._skills.length === 0) {
      return this._experienceLevel;
    }

    const levels = [
      ExperienceLevel.BEGINNER,
      ExperienceLevel.INTERMEDIATE,
      ExperienceLevel.ADVANCED,
      ExperienceLevel.EXPERT,
    ];
    const skillLevels = this._skills.map((skill) => skill.level);

    for (let i = levels.length - 1; i >= 0; i--) {
      if (skillLevels.includes(levels[i])) {
        return levels[i];
      }
    }

    return ExperienceLevel.BEGINNER;
  }

  /**
   * Calculates profile completeness percentage (basic metric)
   */
  calculateCompleteness(): number {
    let score = 0;
    const maxScore = 10;

    // Bio (1 point)
    if (this._bio && this._bio.length >= 50) score += 1;

    // Skills (2 points)
    if (this._skills.length >= 3) score += 1;
    if (this._skills.length >= 5) score += 1;

    // Basic info (2 points)
    if (this._dateOfBirth) score += 1;
    if (this._location) score += 1;

    // Social links (2 points)
    if (this._website || this._linkedInUrl || this._githubUrl) score += 1;
    if ((this._website ? 1 : 0) + (this._linkedInUrl ? 1 : 0) + (this._githubUrl ? 1 : 0) >= 2)
      score += 1;

    // Education (1 point)
    if (this._education.length > 0) score += 1;

    // Achievements (2 points)
    if (this._achievements.length >= 1) score += 1;
    if (this._achievements.length >= 3) score += 1;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Adds a new skill
   */
  addSkill(skill: Skill): UserProfile {
    UserProfile.validateSkill(skill);

    // Check if skill already exists
    if (this.hasSkill(skill.name)) {
      throw new Error(`Skill '${skill.name}' already exists`);
    }

    return new UserProfile(
      this._bio,
      [...this._skills, skill],
      this._experienceLevel,
      this._dateOfBirth,
      this._location,
      this._website,
      this._linkedInUrl,
      this._githubUrl,
      this._education,
      this._achievements,
    );
  }

  /**
   * Removes a skill
   */
  removeSkill(skillName: string): UserProfile {
    const filteredSkills = this._skills.filter(
      (skill) => skill.name.toLowerCase() !== skillName.toLowerCase(),
    );

    return new UserProfile(
      this._bio,
      filteredSkills,
      this._experienceLevel,
      this._dateOfBirth,
      this._location,
      this._website,
      this._linkedInUrl,
      this._githubUrl,
      this._education,
      this._achievements,
    );
  }

  /**
   * Updates skill level
   */
  updateSkillLevel(skillName: string, newLevel: ExperienceLevel): UserProfile {
    const updatedSkills = this._skills.map((skill) =>
      skill.name.toLowerCase() === skillName.toLowerCase() ? { ...skill, level: newLevel } : skill,
    );

    return new UserProfile(
      this._bio,
      updatedSkills,
      this._experienceLevel,
      this._dateOfBirth,
      this._location,
      this._website,
      this._linkedInUrl,
      this._githubUrl,
      this._education,
      this._achievements,
    );
  }

  /**
   * Updates bio
   */
  updateBio(bio: string): UserProfile {
    UserProfile.validateBio(bio);

    return new UserProfile(
      bio,
      this._skills,
      this._experienceLevel,
      this._dateOfBirth,
      this._location,
      this._website,
      this._linkedInUrl,
      this._githubUrl,
      this._education,
      this._achievements,
    );
  }

  /**
   * Updates basic information
   */
  updateBasicInfo(
    location?: string,
    website?: string,
    linkedInUrl?: string,
    githubUrl?: string,
  ): UserProfile {
    UserProfile.validateUrls(website, linkedInUrl, githubUrl);

    return new UserProfile(
      this._bio,
      this._skills,
      this._experienceLevel,
      this._dateOfBirth,
      location || this._location,
      website || this._website,
      linkedInUrl || this._linkedInUrl,
      githubUrl || this._githubUrl,
      this._education,
      this._achievements,
    );
  }

  /**
   * Adds education entry
   */
  addEducation(education: EducationEntry): UserProfile {
    UserProfile.validateEducation(education);

    return new UserProfile(
      this._bio,
      this._skills,
      this._experienceLevel,
      this._dateOfBirth,
      this._location,
      this._website,
      this._linkedInUrl,
      this._githubUrl,
      [...this._education, education],
      this._achievements,
    );
  }

  /**
   * Adds achievement
   */
  addAchievement(achievement: Achievement): UserProfile {
    UserProfile.validateAchievement(achievement);

    return new UserProfile(
      this._bio,
      this._skills,
      this._experienceLevel,
      this._dateOfBirth,
      this._location,
      this._website,
      this._linkedInUrl,
      this._githubUrl,
      this._education,
      [...this._achievements, achievement],
    );
  }

  // Getters for accessing data
  get bio(): string | null {
    return this._bio;
  }
  get skills(): Skill[] {
    return [...this._skills];
  }
  get experienceLevel(): ExperienceLevel {
    return this._experienceLevel;
  }
  get dateOfBirth(): Date | null {
    return this._dateOfBirth;
  }
  get location(): string | null {
    return this._location;
  }
  get website(): string | null {
    return this._website;
  }
  get linkedInUrl(): string | null {
    return this._linkedInUrl;
  }
  get githubUrl(): string | null {
    return this._githubUrl;
  }
  get education(): EducationEntry[] {
    return [...this._education];
  }
  get achievements(): Achievement[] {
    return [...this._achievements];
  }

  /**
   * Converts to persistence format
   */
  toPersistence(): UserProfileData {
    return {
      bio: this._bio || undefined,
      skills: this._skills,
      experienceLevel: this._experienceLevel,
      dateOfBirth: this._dateOfBirth || undefined,
      location: this._location || undefined,
      website: this._website || undefined,
      linkedInUrl: this._linkedInUrl || undefined,
      githubUrl: this._githubUrl || undefined,
      education: this._education,
      achievements: this._achievements,
    };
  }

  /**
   * Creates from persistence data
   */
  static fromPersistence(data: UserProfileData): UserProfile {
    return UserProfile.create(data);
  }

  /**
   * Equality comparison
   */
  equals(other: UserProfile): boolean {
    if (!other) return false;

    return (
      this._bio === other._bio &&
      this._experienceLevel === other._experienceLevel &&
      this._dateOfBirth?.getTime() === other._dateOfBirth?.getTime() &&
      this._location === other._location &&
      this._website === other._website &&
      this._linkedInUrl === other._linkedInUrl &&
      this._githubUrl === other._githubUrl &&
      JSON.stringify(this._skills) === JSON.stringify(other._skills) &&
      JSON.stringify(this._education) === JSON.stringify(other._education) &&
      JSON.stringify(this._achievements) === JSON.stringify(other._achievements)
    );
  }

  /**
   * String representation
   */
  toString(): string {
    return (
      `UserProfile(completeness=${this.calculateCompleteness()}%, skills=${this._skills.length}, ` +
      `education=${this._education.length}, achievements=${this._achievements.length})`
    );
  }

  // Validation methods
  private static validateBio(bio?: string): void {
    if (bio && bio.length > 1000) {
      throw new Error("Bio cannot exceed 1000 characters");
    }
  }

  private static validateSkills(skills: Skill[]): void {
    if (skills.length > 50) {
      throw new Error("Cannot have more than 50 skills");
    }

    skills.forEach((skill) => this.validateSkill(skill));
  }

  private static validateSkill(skill: Skill): void {
    if (!skill.name || skill.name.trim().length === 0) {
      throw new Error("Skill name is required");
    }

    if (skill.name.length > 100) {
      throw new Error("Skill name cannot exceed 100 characters");
    }

    if (!Object.values(SkillCategory).includes(skill.category)) {
      throw new Error("Invalid skill category");
    }

    if (!Object.values(ExperienceLevel).includes(skill.level)) {
      throw new Error("Invalid skill level");
    }

    if (skill.yearsOfExperience && (skill.yearsOfExperience < 0 || skill.yearsOfExperience > 50)) {
      throw new Error("Years of experience must be between 0 and 50");
    }
  }

  private static validateDateOfBirth(dateOfBirth?: Date): void {
    if (dateOfBirth) {
      const today = new Date();
      const age = today.getFullYear() - dateOfBirth.getFullYear();

      if (age < 13 || age > 120) {
        throw new Error("Age must be between 13 and 120 years");
      }
    }
  }

  private static validateUrls(website?: string, linkedInUrl?: string, githubUrl?: string): void {
    const urlRegex = /^https?:\/\/.+/;

    if (website && !urlRegex.test(website)) {
      throw new Error("Website must be a valid URL");
    }

    if (linkedInUrl && (!urlRegex.test(linkedInUrl) || !linkedInUrl.includes("linkedin.com"))) {
      throw new Error("LinkedIn URL must be a valid LinkedIn profile URL");
    }

    if (githubUrl && (!urlRegex.test(githubUrl) || !githubUrl.includes("github.com"))) {
      throw new Error("GitHub URL must be a valid GitHub profile URL");
    }
  }

  private static validateEducation(education: EducationEntry): void {
    if (!education.institution || education.institution.trim().length === 0) {
      throw new Error("Institution name is required");
    }

    if (education.institution.length > 200) {
      throw new Error("Institution name cannot exceed 200 characters");
    }
  }

  private static validateAchievement(achievement: Achievement): void {
    if (!achievement.title || achievement.title.trim().length === 0) {
      throw new Error("Achievement title is required");
    }

    if (achievement.title.length > 200) {
      throw new Error("Achievement title cannot exceed 200 characters");
    }

    if (achievement.description && achievement.description.length > 1000) {
      throw new Error("Achievement description cannot exceed 1000 characters");
    }
  }
}
