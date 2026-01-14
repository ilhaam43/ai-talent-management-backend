import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private repository: NotificationsRepository) {}

  // ============================================
  // Query Methods
  // ============================================

  async getMyNotifications(userId: string, skip = 0, take = 50) {
    return this.repository.findByUserId(userId, { skip, take });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.repository.countUnread(userId);
    return { count };
  }

  async markAsRead(id: string) {
    return this.repository.markAsRead(id);
  }

  async markAllAsRead(userId: string) {
    const result = await this.repository.markAllAsRead(userId);
    return { count: result.count };
  }

  // ============================================
  // Notification Triggers
  // ============================================

  /**
   * Notify HR when a candidate applies and is qualified
   */
  async notifyApplicantQualified(
    candidateName: string,
    jobTitle: string,
    applicationId: string,
    jobVacancyId: string,
  ) {
    const hrUserIds = await this.repository.findHRUserIds();
    
    if (hrUserIds.length === 0) {
      this.logger.warn('No HR users found to notify');
      return;
    }

    const notifications = hrUserIds.map((userId) => ({
      userId,
      type: NotificationType.APPLICANT_QUALIFIED,
      title: 'New Qualified Applicant',
      message: `${candidateName} has applied for ${jobTitle} and is qualified for screening.`,
      data: { applicationId, jobVacancyId, candidateName, jobTitle },
    }));

    await this.repository.createManyNotifications(notifications);
    this.logger.log(`Notified ${hrUserIds.length} HR users about qualified applicant`);
  }

  /**
   * Notify all HR users when a new job vacancy is created
   */
  async notifyJobVacancyCreated(
    jobTitle: string,
    jobVacancyId: string,
    createdByUserId: string,
  ) {
    const hrUserIds = await this.repository.findHRUserIdsExcept(createdByUserId);
    
    if (hrUserIds.length === 0) return;

    const notifications = hrUserIds.map((userId) => ({
      userId,
      type: NotificationType.JOB_VACANCY_CREATED,
      title: 'New Job Vacancy',
      message: `A new job vacancy "${jobTitle}" has been created.`,
      data: { jobVacancyId, jobTitle },
    }));

    await this.repository.createManyNotifications(notifications);
    this.logger.log(`Notified ${hrUserIds.length} HR users about new job vacancy`);
  }

  /**
   * Notify all HR users when a job vacancy is updated
   */
  async notifyJobVacancyUpdated(
    jobTitle: string,
    jobVacancyId: string,
    updatedByUserId: string,
  ) {
    const hrUserIds = await this.repository.findHRUserIdsExcept(updatedByUserId);
    
    if (hrUserIds.length === 0) return;

    const notifications = hrUserIds.map((userId) => ({
      userId,
      type: NotificationType.JOB_VACANCY_UPDATED,
      title: 'Job Vacancy Updated',
      message: `The job vacancy "${jobTitle}" has been updated.`,
      data: { jobVacancyId, jobTitle },
    }));

    await this.repository.createManyNotifications(notifications);
    this.logger.log(`Notified ${hrUserIds.length} HR users about job vacancy update`);
  }

  /**
   * Notify HR who uploaded the batch when Talent Pool analysis is complete
   */
  async notifyTalentPoolComplete(
    batchId: string,
    batchName: string | null,
    totalFiles: number,
    processedFiles: number,
    failedFiles: number,
    uploadedByUserId: string,
  ) {
    const displayName = batchName || `Batch ${batchId.substring(0, 8)}`;
    const successRate = Math.round((processedFiles / totalFiles) * 100);

    await this.repository.createNotification({
      userId: uploadedByUserId,
      type: NotificationType.TALENT_POOL_COMPLETE,
      title: 'Talent Pool Analysis Complete',
      message: `${displayName}: ${processedFiles}/${totalFiles} CVs analyzed (${successRate}% success). ${failedFiles > 0 ? `${failedFiles} failed.` : ''}`,
      data: { batchId, batchName, totalFiles, processedFiles, failedFiles },
    });

    this.logger.log(`Notified user ${uploadedByUserId} about Talent Pool batch completion`);
  }
}
