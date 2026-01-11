import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TalentPoolRepository } from './talent-pool.repository';
import { PrismaService } from '../database/prisma.service';
import { UploadTalentPoolDto, TalentPoolSourceTypeValue } from './dto/upload.dto';
import { N8nCallbackDto, AiMatchStatusValue } from './dto/callback.dto';
import { UpdateHRStatusDto, BulkActionDto, TalentPoolHRStatusValue } from './dto/update-status.dto';
import axios from 'axios';

@Injectable()
export class TalentPoolService {
  private readonly logger = new Logger(TalentPoolService.name);
  private readonly n8nWebhookUrl: string;
  private readonly batchSize = 10; // Process 10 CVs per batch

  constructor(
    private repository: TalentPoolRepository,
    private prisma: PrismaService,
    private configService: ConfigService,
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

    // Create batch record (cast DTO enum to Prisma enum)
    const batch = await this.repository.createBatch({
      batchName: dto.batchName,
      uploadedById,
      sourceType: dto.sourceType as any, // DTO enum to Prisma enum
      sourceUrl: dto.sourceUrl,
      totalFiles: files.length,
    });

    // Create queue items for all files
    await this.repository.createQueueItems(batch.id, files);

    // Update batch status to QUEUED
    await this.repository.updateBatchStatus(batch.id, 'QUEUED' as any);

    // Start processing in background (don't await)
    this.processNextBatch().catch((err) => {
      this.logger.error(`Error starting batch processing: ${err.message}`);
    });

    return {
      batch,
      message: `${files.length} files queued for processing. Check batch status for progress.`,
    };
  }

  // ============================================
  // Queue Processing
  // ============================================

  async processNextBatch(): Promise<void> {
    // Get pending queue items (10 at a time)
    const queueItems = await this.repository.findPendingQueueItems(this.batchSize);

    if (queueItems.length === 0) {
      this.logger.log('No pending queue items to process');
      return;
    }

    const queueItemIds = queueItems.map((q) => q.id);
    const batchIds = [...new Set(queueItems.map((q) => q.batchId))];

    // Mark all items as PROCESSING
    await this.repository.markQueueItemsProcessing(queueItemIds);

    // Update batch statuses to PROCESSING
    for (const batchId of batchIds) {
      await this.repository.updateBatchStatus(batchId, 'PROCESSING' as any);
    }

    // Send to n8n for processing
    if (this.n8nWebhookUrl) {
      try {
        const payload = {
          queueItems: queueItems.map((q) => ({
            queueItemId: q.id,
            batchId: q.batchId,
            fileUrl: q.fileUrl,
            fileName: q.fileName,
          })),
        };

        this.logger.log(`Sending ${queueItems.length} items to n8n for processing`);
        
        await axios.post(this.n8nWebhookUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000, // 5 min timeout for batch
        });
      } catch (error: any) {
        this.logger.error(`Failed to send to n8n: ${error.message}`);
        // Mark items as FAILED
        for (const id of queueItemIds) {
          await this.repository.updateQueueItemStatus(
            id,
            'FAILED' as any,
            `n8n error: ${error.message}`,
          );
        }
      }
    } else {
      this.logger.warn('N8N_TALENT_POOL_WEBHOOK_URL not configured');
    }
  }

  // ============================================
  // n8n Callback Handler
  // ============================================

  async handleN8nCallback(dto: N8nCallbackDto): Promise<{ success: boolean; candidateId?: string }> {
    const { batchId, queueItemId, success, errorMessage, candidateData } = dto;

    if (!success || !candidateData) {
      // Mark queue item as failed
      await this.repository.updateQueueItemStatus(
        queueItemId,
        'FAILED' as any,
        errorMessage || 'Unknown error',
      );
      await this.repository.incrementBatchProgress(batchId, false);
      this.checkBatchCompletion(batchId);
      return { success: false };
    }

    // Check for duplicate by email
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
              aiMatchStatus: s.aiMatchStatus as any, // DTO enum to Prisma enum
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
        this.checkBatchCompletion(batchId);
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
          aiMatchStatus: s.aiMatchStatus as any, // DTO enum to Prisma enum
          aiInsight: s.aiInsight,
          aiInterview: s.aiInterview,
          aiCoreValue: s.aiCoreValue,
        })),
      );
    }

    // Update queue item status
    await this.repository.updateQueueItemStatus(queueItemId, 'COMPLETED' as any);
    await this.repository.incrementBatchProgress(batchId, true);
    this.checkBatchCompletion(batchId);

    return { success: true, candidateId: candidate.id };
  }

  private async checkBatchCompletion(batchId: string): Promise<void> {
    const batch = await this.repository.findBatchById(batchId);
    if (!batch) return;

    const totalProcessed = batch.processedFiles + batch.failedFiles;
    
    if (totalProcessed >= batch.totalFiles) {
      const status = batch.failedFiles > 0
        ? 'PARTIALLY_FAILED'
        : 'COMPLETED';
      
      await this.repository.updateBatchStatus(batchId, status as any);
      this.logger.log(`Batch ${batchId} completed with status: ${status}`);

      // Check if there are more pending items to process
      this.processNextBatch().catch((err) => {
        this.logger.error(`Error processing next batch: ${err.message}`);
      });
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
      dto.hrStatus as any, // DTO enum to Prisma enum
      dto.hrNotes,
      dto.processedToStep,
    );
  }

  async bulkAction(dto: BulkActionDto): Promise<{ count: number }> {
    return this.repository.bulkUpdateCandidateStatus(
      dto.candidateIds,
      dto.hrStatus as any, // DTO enum to Prisma enum
      dto.processedToStep,
    );
  }

  // ============================================
  // Get Open Jobs (for n8n)
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
}
