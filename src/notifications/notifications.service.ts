import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private repository: NotificationsRepository) {}

  // ============================================
  // Query Methods
  // ============================================

  async getMyNotifications(userId: string, skip = 0, take = 50) {
    const safeSkip = Math.max(skip, 0);
    const safeTake = Math.min(Math.max(take, 1), 100);
    const [data, total] = await Promise.all([
      this.repository.findByUserId(userId, { skip: safeSkip, take: safeTake }),
      this.repository.countByUserId(userId),
    ]);
    return { data, total, skip: safeSkip, take: safeTake };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.repository.countUnread(userId);
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    try {
      const notification = await this.repository.markAsRead(id, userId);
      return notification;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'){
        throw new NotFoundException('Notification not found');
      }
      throw error;
    }
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
    const successRate = totalFiles === 0 ? 0 : Math.round((processedFiles / totalFiles) * 100);

    await this.repository.createNotification({
      userId: uploadedByUserId,
      type: NotificationType.TALENT_POOL_COMPLETE,
      title: 'Talent Pool Analysis Complete',
      message: `${displayName}: ${processedFiles}/${totalFiles} CVs analyzed (${successRate}% success). ${failedFiles > 0 ? `${failedFiles} failed.` : ''}`,
      data: { batchId, batchName, totalFiles, processedFiles, failedFiles },
    });

    this.logger.log(`Notified user ${uploadedByUserId} about Talent Pool batch completion`);
  }

  /**
   * Notify a member that their own rolling message window (5h / 1w) is full.
   * Rolling windows are per member, so only the blocked user is told.
   */
  async notifyQuotaWindowLimit(
    userId: string,
    opts: { window: 'fiveHour' | 'week'; limit: number; used: number; freesAt: string | null },
  ) {
    const label = opts.window === 'fiveHour' ? '5-hour' : '1-week';

    await this.repository.createNotification({
      userId,
      type: NotificationType.QUOTA_EXHAUSTED,
      title: 'Message Limit Reached',
      message: `Your ${label} message limit (${opts.limit} messages) is reached.${this.freesAtClause(opts.freesAt)}`,
      data: { scope: 'window', window: opts.window, limit: opts.limit, used: opts.used, freesAt: opts.freesAt },
    });

    this.logger.log(`Notified user ${userId} about ${label} message window limit`);
  }

  /**
   * Warn a member that their own rolling message window is nearly full.
   */
  async notifyQuotaWindowWarning(
    userId: string,
    opts: { window: 'fiveHour' | 'week'; limit: number; used: number; pct: number },
  ) {
    const label = opts.window === 'fiveHour' ? '5-hour' : '1-week';

    await this.repository.createNotification({
      userId,
      type: NotificationType.QUOTA_WARNING,
      title: 'Message Limit Almost Reached',
      message: `You have used ${opts.pct}% of your ${label} message limit (${opts.used}/${opts.limit}).`,
      data: { scope: 'window', window: opts.window, limit: opts.limit, used: opts.used, pct: opts.pct },
    });

    this.logger.log(`Warned user ${userId} at ${opts.pct}% of ${label} message window`);
  }

  /**
   * Notify every member of a company that the shared plan message quota is
   * exhausted — the AI assistant is now unavailable to all of them.
   */
  async notifyCompanyQuotaExhausted(
    memberUserIds: string[],
    opts: { companyName: string; planName: string | null; usedMessages: number; planMessages: number | null; triggeredByName?: string },
  ) {
    if (memberUserIds.length === 0) {
      this.logger.warn('No company members found to notify about quota exhaustion');
      return;
    }

    const planClause = opts.planName ? ` on the ${opts.planName} plan` : '';
    const usageClause = opts.planMessages
      ? ` (${opts.usedMessages}/${opts.planMessages} messages used)`
      : '';
    const byClause = opts.triggeredByName ? ` Triggered by ${opts.triggeredByName}.` : '';

    const notifications = memberUserIds.map((userId) => ({
      userId,
      type: NotificationType.QUOTA_EXHAUSTED,
      title: 'AI Assistant Quota Exhausted',
      message: `${opts.companyName} has used its monthly AI Assistant message quota${planClause}${usageClause}. Contact your HR administrator to upgrade.${byClause}`,
      data: {
        scope: 'plan',
        companyName: opts.companyName,
        planName: opts.planName,
        usedMessages: opts.usedMessages,
        planMessages: opts.planMessages,
      },
    }));

    await this.repository.createManyNotifications(notifications);
    this.logger.log(`Notified ${memberUserIds.length} members of ${opts.companyName} about plan quota exhaustion`);
  }

  /**
   * Warn the company's HR admin that the shared plan quota is nearly used up,
   * while there is still headroom to act on.
   */
  async notifyCompanyQuotaWarning(
    adminUserId: string,
    opts: { companyName: string; planName: string | null; usedMessages: number; planMessages: number; pct: number },
  ) {
    await this.repository.createNotification({
      userId: adminUserId,
      type: NotificationType.QUOTA_WARNING,
      title: 'AI Assistant Quota Almost Exhausted',
      message: `${opts.companyName} has used ${opts.pct}% of its monthly AI Assistant message quota (${opts.usedMessages}/${opts.planMessages}${opts.planName ? ` on ${opts.planName}` : ''}).`,
      data: {
        scope: 'plan',
        companyName: opts.companyName,
        planName: opts.planName,
        usedMessages: opts.usedMessages,
        planMessages: opts.planMessages,
        pct: opts.pct,
      },
    });

    this.logger.log(`Warned HR admin ${adminUserId} at ${opts.pct}% of ${opts.companyName} plan quota`);
  }

  private freesAtClause(freesAt: string | null): string {
    if (!freesAt) return '';
    const when = new Date(freesAt);
    if (Number.isNaN(when.getTime())) return '';
    return ` A slot frees up at ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`;
  }
}
