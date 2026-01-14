import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TalentPoolRepository } from './talent-pool.repository';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadTalentPoolDto } from './dto/upload.dto';
import { N8nCallbackDto, AiMatchStatusValue } from './dto/callback.dto';
import { UpdateHRStatusDto, BulkActionDto } from './dto/update-status.dto';
import axios from 'axios';

@Injectable()
export class TalentPoolService {
  private readonly logger = new Logger(TalentPoolService.name);
  private readonly n8nWebhookUrl: string;

  constructor(
    private repository: TalentPoolRepository,
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    this.n8nWebhookUrl = this.configService.get<string>('N8N_TALENT_POOL_WEBHOOK_URL') || '';
  }

  // ============================================
  // Upload Flow
  // ============================================

  async createBatchUpload(
    uploadedById: string,
    dto: UploadTalentPoolDto,
    files: { fileUrl: string; fileName: string }[],
  ): Promise<{ batch: any; message: string }> {
    if (files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 50) {
      throw new BadRequestException('Maximum 50 files per upload');
    }

    // Create batch record
    const batch = await this.repository.createBatch({
      batchName: dto.batchName,
      uploadedById,
      sourceType: dto.sourceType as any,
      sourceUrl: dto.sourceUrl,
      totalFiles: files.length,
    });

    // Create queue items for all files
    await this.repository.createQueueItems(batch.id, files);

    // Update batch status to QUEUED
    await this.repository.updateBatchStatus(batch.id, 'QUEUED' as any);

    // Start processing in background (don't await) - SEQUENTIAL: 1 CV at a time
    this.processNextItemInBatch(batch.id).catch((err) => {
      this.logger.error(`Error starting batch processing: ${err.message}`);
    });

    return {
      batch,
      message: `${files.length} files queued for processing. Check batch status for progress.`,
    };
  }

  // ============================================
  // SEQUENTIAL Queue Processing (1 CV at a time)
  // ============================================

  /**
   * Process next pending item in a specific batch (SEQUENTIAL)
   * Sends 1 CV at a time to n8n
   */
  async processNextItemInBatch(batchId: string): Promise<void> {
    // Get FIRST pending item in this batch
    const item = await this.repository.findNextPendingInBatch(batchId);

    if (!item) {
      // No more pending items - check if batch is complete
      await this.checkBatchCompletionAndNotify(batchId);
      return;
    }

    // Update batch status to PROCESSING if not already
    await this.repository.updateBatchStatus(batchId, 'PROCESSING' as any);

    // Mark this single item as PROCESSING
    await this.repository.updateQueueItemStatus(item.id, 'PROCESSING' as any);

    // Get current progress for logging
    const batch = await this.repository.findBatchById(batchId);
    const currentPosition = (batch?.processedFiles || 0) + (batch?.failedFiles || 0) + 1;
    const totalFiles = batch?.totalFiles || 1;

    this.logger.log(`[Batch ${batchId.substring(0, 8)}] Processing CV ${currentPosition}/${totalFiles}: ${item.fileName}`);

    // Send ONLY this 1 CV to n8n
    if (this.n8nWebhookUrl) {
      try {
        const payload = {
          queueItems: [{
            queueItemId: item.id,
            batchId: item.batchId,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
          }],
        };

        await axios.post(this.n8nWebhookUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000, // 2 min timeout per CV
        });

        this.logger.log(`[Batch ${batchId.substring(0, 8)}] Sent to n8n: ${item.fileName}`);
      } catch (error: any) {
        this.logger.error(`Failed to send to n8n: ${error.message}`);
        
        // Mark this item as FAILED
        await this.repository.updateQueueItemStatus(item.id, 'FAILED' as any, `n8n error: ${error.message}`);
        await this.repository.incrementBatchProgress(batchId, false);
        
        // Continue with next item
        this.processNextItemInBatch(batchId).catch((err) => {
          this.logger.error(`Error processing next item: ${err.message}`);
        });
      }
    } else {
      this.logger.warn('N8N_TALENT_POOL_WEBHOOK_URL not configured');
      await this.repository.updateQueueItemStatus(item.id, 'FAILED' as any, 'n8n webhook not configured');
      await this.repository.incrementBatchProgress(batchId, false);
      
      // Continue with next item
      this.processNextItemInBatch(batchId).catch((err) => {
        this.logger.error(`Error processing next item: ${err.message}`);
      });
    }
  }

  // ============================================
  // n8n Callback Handler
  // ============================================

  async handleN8nCallback(dto: N8nCallbackDto): Promise<{ success: boolean; candidateId?: string }> {
    const { batchId, queueItemId, success, errorMessage, candidateData } = dto;

    if (!success || !candidateData) {
      // Mark queue item as failed
      await this.repository.updateQueueItemStatus(queueItemId, 'FAILED' as any, errorMessage || 'Unknown error');
      await this.repository.incrementBatchProgress(batchId, false);
      
      // Process next CV in batch (SEQUENTIAL)
      this.processNextItemInBatch(batchId).catch((err) => {
        this.logger.error(`Error processing next item: ${err.message}`);
      });
      
      return { success: false };
    }

    // Check for duplicate by email
    let candidateId: string | undefined;
    
    if (candidateData.email) {
      const existingCandidate = await this.repository.findCandidateByEmail(candidateData.email);
      
      if (existingCandidate) {
        // Add new screenings for jobs not yet screened
        const existingJobIds = await this.repository.getScreenedJobIds(existingCandidate.id);
        const newScreenings = candidateData.screenings.filter(
          (s) => !existingJobIds.includes(s.jobVacancyId),
        );

        if (newScreenings.length > 0) {
          await this.repository.createManyScreenings(
            newScreenings.map((s) => ({
              talentPoolCandidateId: existingCandidate.id,
              jobVacancyId: s.jobVacancyId,
              fitScore: s.fitScore,
              aiMatchStatus: s.aiMatchStatus as any,
              aiInsight: s.aiInsight,
              aiInterview: s.aiInterview,
              aiCoreValue: s.aiCoreValue,
            })),
          );
          this.logger.log(`Added ${newScreenings.length} new screenings for existing candidate ${existingCandidate.id}`);
        }

        // Mark as duplicate but processed
        await this.repository.updateQueueItemStatus(queueItemId, 'DUPLICATE' as any);
        await this.repository.incrementBatchProgress(batchId, true);
        
        // Check if email exists in Candidate table for real applications
        await this.checkAndCreateCandidateApplications(candidateData.email, newScreenings);
        
        // Process next CV (SEQUENTIAL)
        this.processNextItemInBatch(batchId).catch((err) => {
          this.logger.error(`Error processing next item: ${err.message}`);
        });
        
        return { success: true, candidateId: existingCandidate.id };
      }
    }

    // Create new candidate
    const candidate = await this.repository.createCandidate({
      batchId,
      fullName: candidateData.fullName,
      email: candidateData.email,
      phone: candidateData.phone,
      city: candidateData.city,
      linkedin: candidateData.linkedin,
      educationData: candidateData.education,
      workExperienceData: candidateData.workExperience,
      skillsData: candidateData.skills,
      certificationsData: candidateData.certifications,
      organizationData: candidateData.organizationExperience,
      cvFileUrl: candidateData.cvFileUrl,
      cvFileName: candidateData.cvFileName,
    });

    candidateId = candidate.id;

    // Create screenings (only for scores >= 65 or MATCH/STRONG_MATCH)
    const validScreenings = candidateData.screenings.filter(
      (s) => s.fitScore >= 65 || s.aiMatchStatus !== AiMatchStatusValue.NOT_MATCH,
    );

    if (validScreenings.length > 0) {
      await this.repository.createManyScreenings(
        validScreenings.map((s) => ({
          talentPoolCandidateId: candidate.id,
          jobVacancyId: s.jobVacancyId,
          fitScore: s.fitScore,
          aiMatchStatus: s.aiMatchStatus as any,
          aiInsight: s.aiInsight,
          aiInterview: s.aiInterview,
          aiCoreValue: s.aiCoreValue,
        })),
      );
    }

    // Check if email exists in Candidate table for real applications
    if (candidateData.email) {
      await this.checkAndCreateCandidateApplications(candidateData.email, validScreenings);
    }

    // Update queue item status
    await this.repository.updateQueueItemStatus(queueItemId, 'COMPLETED' as any);
    await this.repository.incrementBatchProgress(batchId, true);

    // Process next CV (SEQUENTIAL)
    this.processNextItemInBatch(batchId).catch((err) => {
      this.logger.error(`Error processing next item: ${err.message}`);
    });

    return { success: true, candidateId };
  }

  /**
   * Check if email exists in Candidate table and create CandidateApplication
   */
  private async checkAndCreateCandidateApplications(
    email: string,
    screenings: { jobVacancyId: string; fitScore: number; aiMatchStatus: string; aiInsight?: string; aiInterview?: string; aiCoreValue?: string }[],
  ) {
    // Find candidate by email
    const candidate = await this.prisma.candidate.findFirst({
      where: {
        user: { email: email },
      },
      select: { id: true },
    });

    if (!candidate) {
      this.logger.log(`No registered candidate found for email: ${email}`);
      return;
    }

    this.logger.log(`Found registered candidate ${candidate.id} for email: ${email}`);

    // Get candidate's salary (or create default)
    let candidateSalary = await this.prisma.candidateSalary.findFirst({
      where: { candidateId: candidate.id },
    });

    if (!candidateSalary) {
      candidateSalary = await this.prisma.candidateSalary.create({
        data: { candidateId: candidate.id },
      });
    }

    // Get pipeline stages and statuses
    const screeningStage = await this.prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: 'Screening' },
    });
    const qualifiedStatus = await this.prisma.applicationLastStatus.findFirst({
      where: { applicationLastStatus: 'Qualified' },
    });
    const qualifiedPipelineStatus = await this.prisma.applicationPipelineStatus.findFirst({
      where: { applicationPipelineStatus: 'Qualified' },
    });
    const appliedStage = await this.prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: 'Applied' },
    });

    if (!screeningStage || !qualifiedStatus || !qualifiedPipelineStatus || !appliedStage) {
      this.logger.warn('Required pipeline stages/statuses not found - skipping application creation');
      return;
    }

    // Create CandidateApplication for each qualified screening
    for (const screening of screenings) {
      if (screening.fitScore < 65 && screening.aiMatchStatus === 'NOT_MATCH') {
        continue; // Skip unqualified
      }

      // Check if application already exists
      const existingApp = await this.prisma.candidateApplication.findFirst({
        where: {
          candidateId: candidate.id,
          jobVacancyId: screening.jobVacancyId,
        },
      });

      if (existingApp) {
        this.logger.log(`Application already exists for job ${screening.jobVacancyId}`);
        continue;
      }

      // Create application
      const application = await this.prisma.candidateApplication.create({
        data: {
          candidateId: candidate.id,
          jobVacancyId: screening.jobVacancyId,
          candidateSalaryId: candidateSalary.id,
          applicationLatestStatusId: qualifiedStatus.id,
          applicationPipelineId: screeningStage.id,
          fitScore: screening.fitScore,
          aiInsight: screening.aiInsight,
          aiInterview: screening.aiInterview,
          aiCoreValue: screening.aiCoreValue,
          aiMatchStatus: screening.aiMatchStatus as any,
          submissionDate: new Date(),
        },
      });

      // Create pipeline entries
      await this.prisma.candidateApplicationPipeline.createMany({
        data: [
          {
            candidateApplicationId: application.id,
            applicationPipelineId: appliedStage.id,
            applicationPipelineStatusId: qualifiedPipelineStatus.id,
            notes: 'Automatically created from Talent Pool screening',
          },
          {
            candidateApplicationId: application.id,
            applicationPipelineId: screeningStage.id,
            applicationPipelineStatusId: qualifiedPipelineStatus.id,
            notes: 'Automatically qualified based on Talent Pool AI screening',
          },
        ],
      });

      this.logger.log(`Created CandidateApplication for job ${screening.jobVacancyId}`);
    }
  }

  /**
   * Check if batch is complete and notify HR
   */
  private async checkBatchCompletionAndNotify(batchId: string): Promise<void> {
    const batch = await this.repository.findBatchById(batchId);
    if (!batch) return;

    const totalProcessed = batch.processedFiles + batch.failedFiles;
    
    if (totalProcessed >= batch.totalFiles) {
      const status = batch.failedFiles > 0 ? 'PARTIALLY_FAILED' : 'COMPLETED';
      
      await this.repository.updateBatchStatus(batchId, status as any);
      this.logger.log(`Batch ${batchId} completed with status: ${status}`);

      // Get uploader's userId for notification
      const employee = await this.prisma.employee.findUnique({
        where: { id: batch.uploadedById },
        select: { userId: true },
      });

      if (employee) {
        // Send notification to HR who uploaded
        await this.notificationsService.notifyTalentPoolComplete(
          batchId,
          batch.batchName,
          batch.totalFiles,
          batch.processedFiles,
          batch.failedFiles,
          employee.userId,
        );
      }
    }
  }

  // ============================================
  // Query Methods
  // ============================================

  async getBatches(skip = 0, take = 20): Promise<any[]> {
    return this.repository.findAllBatches({ skip, take });
  }

  async getBatchById(id: string): Promise<any> {
    const batch = await this.repository.findBatchById(id);
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }
    return batch;
  }

  async getCandidates(params: {
    skip?: number;
    take?: number;
    batchId?: string;
    jobVacancyId?: string;
    hrStatus?: any;
    minScore?: number;
    search?: string;
  }): Promise<{ candidates: any[]; total: number }> {
    return this.repository.findAllCandidates(params);
  }

  async getCandidateById(id: string): Promise<any> {
    const candidate = await this.repository.findCandidateById(id);
    if (!candidate) {
      throw new NotFoundException(`Candidate ${id} not found`);
    }
    return candidate;
  }

  // ============================================
  // HR Actions
  // ============================================

  async updateHRStatus(id: string, dto: UpdateHRStatusDto): Promise<any> {
    const candidate = await this.repository.findCandidateById(id);
    if (!candidate) {
      throw new NotFoundException(`Candidate ${id} not found`);
    }

    return this.repository.updateCandidateHRStatus(
      id,
      dto.hrStatus as any,
      dto.hrNotes,
      dto.processedToStep,
    );
  }

  async bulkAction(dto: BulkActionDto): Promise<{ count: number }> {
    return this.repository.bulkUpdateCandidateStatus(
      dto.candidateIds,
      dto.hrStatus as any,
      dto.processedToStep,
    );
  }

  // ============================================
  // Get Open Jobs (for n8n - PUBLIC)
  // ============================================

  async getOpenJobs(): Promise<any[]> {
    return this.prisma.jobVacancy.findMany({
      where: {
        jobVacancyStatus: { jobVacancyStatus: 'OPEN' },
      },
      include: {
        jobRole: true,
        division: true,
        department: true,
        jobVacancySkills: {
          include: { skill: true },
        },
      },
    });
  }

  /**
   * Get employee by userId (for HR lookup)
   */
  async getEmployeeByUserId(userId: string): Promise<{ id: string } | null> {
    return this.prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });
  }
}
