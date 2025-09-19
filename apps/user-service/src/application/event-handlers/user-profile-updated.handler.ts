import { Injectable } from "@nestjs/common";
import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { UserProfileUpdatedEvent } from "../../domain/events/user-profile-updated.event";
import { EventBridgeService } from "../../infrastructure/event-bridge/event-bridge.service";

interface Milestone {
  type: string;
  completeness?: number;
  skillCount?: number;
}

interface ProfileChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * User Profile Updated Event Handler
 *
 * Handles side effects when a user's profile is updated.
 * Updates search indexes, recommendations, and notifications.
 */
@EventsHandler(UserProfileUpdatedEvent)
@Injectable()
export class UserProfileUpdatedEventHandler implements IEventHandler<UserProfileUpdatedEvent> {
  constructor(private readonly eventBridgeService: EventBridgeService) {}

  async handle(event: UserProfileUpdatedEvent): Promise<void> {
    try {
      console.log("Handling UserProfileUpdatedEvent:", {
        eventId: event.eventId,
        userId: event.userId,
        profileSection: event.profileSection,
        completenessIncrease: event.completenessIncrease,
        correlationId: event.correlationId,
      });

      // 1. Publish event to external systems
      await this.eventBridgeService.publishEvent(event);

      // 2. Update search indexes with new profile data
      this.updateSearchIndexes(event);

      // 3. Refresh user recommendations
      this.refreshUserRecommendations(event);

      // 4. Check for milestone achievements
      this.checkProfileMilestones(event);

      // 5. Update tutoring eligibility if applicable
      this.updateTutoringEligibility(event);

      console.log("UserProfileUpdatedEvent handled successfully");
    } catch (error) {
      console.error("Error handling UserProfileUpdatedEvent:", error);
      throw error;
    }
  }

  private updateSearchIndexes(event: UserProfileUpdatedEvent): void {
    console.log(`Updating search indexes for user ${event.userId}`);

    // Extract searchable data from profile changes
    // const searchableData = {
    //   userId: event.userId,
    //   updatedFields: event.changedFields,
    //   profileSection: event.profileSection,
    //   timestamp: event.occurredAt,
    //   correlationId: event.correlationId,
    // };

    // In real implementation:
    // await this.searchService.updateUserIndex(searchableData);
  }

  private refreshUserRecommendations(event: UserProfileUpdatedEvent): void {
    console.log(`Refreshing recommendations for user ${event.userId}`);

    // Check if changes affect recommendations
    const affectsRecommendations = event.changedFields.some((field) =>
      ["skills", "experienceLevel", "education"].includes(field),
    );

    if (affectsRecommendations) {
      // const recommendationRefresh = {
      //   userId: event.userId,
      //   reason: "profile_updated",
      //   changedFields: event.changedFields,
      //   correlationId: event.correlationId,
      // };

      // In real implementation:
      // await this.recommendationService.refreshUserRecommendations(recommendationRefresh);
    }
  }

  private checkProfileMilestones(event: UserProfileUpdatedEvent): void {
    console.log(`Checking profile milestones for user ${event.userId}`);

    const milestones: Milestone[] = [];

    // Check completeness milestones
    const previousCompleteness = event.payload.previousCompleteness;
    const newCompleteness = event.payload.newCompleteness;

    if (previousCompleteness < 50 && newCompleteness >= 50) {
      milestones.push({ type: "profile_half_complete", completeness: newCompleteness });
    }

    if (previousCompleteness < 75 && newCompleteness >= 75) {
      milestones.push({ type: "profile_mostly_complete", completeness: newCompleteness });
    }

    if (previousCompleteness < 100 && newCompleteness >= 100) {
      milestones.push({ type: "profile_fully_complete", completeness: newCompleteness });
    }

    // Check skills milestones
    const changes = event.payload.changes as ProfileChange[];
    const skillsChange = changes.find((change) => change.field === "skills");
    if (skillsChange && Array.isArray(skillsChange.newValue)) {
      const skillCount = skillsChange.newValue.length;
      if (skillCount >= 5) {
        milestones.push({ type: "skills_milestone", skillCount });
      }
    }

    // Process milestones
    for (const milestone of milestones) {
      this.processMilestone(event.userId!, milestone);
    }
  }

  private processMilestone(
    userId: string,
    milestone: Milestone,
  ): void {
    console.log(`Processing milestone for user ${userId}:`, milestone);

    // const milestoneData = {
    //   userId,
    //   milestone,
    //   timestamp: new Date(),
    //   correlationId: event.correlationId,
    // };

    // In real implementation:
    // await this.achievementService.recordMilestone(milestoneData);
    // await this.notificationService.sendMilestoneNotification(milestoneData);
  }

  private updateTutoringEligibility(event: UserProfileUpdatedEvent): void {
    const completenessThreshold = 70;
    const previousCompleteness = event.payload.previousCompleteness;
    const newCompleteness = event.payload.newCompleteness;

    // Check if user became eligible for tutoring
    const becameEligible =
      previousCompleteness < completenessThreshold && newCompleteness >= completenessThreshold;

    if (becameEligible) {
      console.log(
        `User ${event.userId} became eligible for tutoring with ${newCompleteness}% profile completeness`,
      );

      // const eligibilityUpdate = {
      //   userId: event.userId,
      //   eligible: true,
      //   reason: "profile_completeness_threshold_met",
      //   completeness: newCompleteness,
      //   correlationId: event.correlationId,
      // };

      // In real implementation:
      // await this.tutoringEligibilityService.updateEligibility(eligibilityUpdate);

      // Send notification about tutoring eligibility
      // const notificationData = {
      //   userId: event.userId,
      //   type: "tutoring_eligible",
      //   title: "You're now eligible to become a tutor!",
      //   message: `Your profile is ${newCompleteness}% complete. You can now apply to become a tutor.`,
      //   correlationId: event.correlationId,
      // };

      // In real implementation:
      // await this.notificationService.sendNotification(notificationData);
    }
  }
}
