import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CandidateRating } from '@prisma/client';
import { TalentPoolRepository } from './talent-pool.repository';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { UploadTalentPoolDto } from './dto/upload.dto';
import { N8nCallbackDto, AiMatchStatusValue } from './dto/callback.dto';
import { UpdateHRStatusDto, BulkActionDto } from './dto/update-status.dto';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class TalentPoolService {
  private readonly logger = new Logger(TalentPoolService.name);
  private readonly n8nWebhookUrl: string;

  constructor(
    private repository: TalentPoolRepository,
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
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

    let candidateId: string | undefined;
    
    // Check for duplicate in UNIFIED Candidate table by email
    if (candidateData.email) {
      const existingCandidate = await this.prisma.candidate.findFirst({
        where: { candidateEmail: candidateData.email },
        select: { id: true, userId: true },
      });
      
      if (existingCandidate) {
        this.logger.log(`Duplicate candidate found: ${candidateData.email}, updating profile data and screenings`);
        
        // Update profile data (skills, education, work experience, etc.) for existing candidate
        await this.updateCandidateProfileData(existingCandidate.id, {
          skills: candidateData.skills,
          education: candidateData.education,
          workExperience: candidateData.workExperience,
          certifications: candidateData.certifications,
          organizationExperience: candidateData.organizationExperience,
        });
        
        // Create CandidateApplications for new job screenings
        await this.createCandidateApplicationsFromScreenings(
          existingCandidate.id,
          candidateData.screenings,
        );
        
        // Mark as duplicate but processed
        await this.repository.updateQueueItemStatus(queueItemId, 'DUPLICATE' as any);
        await this.repository.incrementBatchProgress(batchId, true);
        
        // Process next CV (SEQUENTIAL)
        this.processNextItemInBatch(batchId).catch((err) => {
          this.logger.error(`Error processing next item: ${err.message}`);
        });
        
        return { success: true, candidateId: existingCandidate.id };
      }
    }

    // Create UNIFIED candidate (User + Candidate + Profile records)
    try {
      const result = await this.createUnifiedTalentPoolCandidate(batchId, {
        fullName: candidateData.fullName,
        email: candidateData.email,
        phone: candidateData.phone,
        city: candidateData.city,
        linkedin: candidateData.linkedin,
        education: candidateData.education,
        workExperience: candidateData.workExperience,
        skills: candidateData.skills,
        certifications: candidateData.certifications,
        organizationExperience: candidateData.organizationExperience,
        cvFileUrl: candidateData.cvFileUrl,
        cvFileName: candidateData.cvFileName,
      });

      candidateId = result.candidateId;
      this.logger.log(`Created unified candidate: ${candidateId}`);

      // Create CandidateApplications from AI screenings (for qualified matches)
      await this.createCandidateApplicationsFromScreenings(candidateId, candidateData.screenings);

    } catch (error: any) {
      this.logger.error(`Failed to create unified candidate: ${error.message}`);
      
      // Mark queue item as failed
      await this.repository.updateQueueItemStatus(queueItemId, 'FAILED' as any, error.message);
      await this.repository.incrementBatchProgress(batchId, false);
      
      // Process next CV (SEQUENTIAL)
      this.processNextItemInBatch(batchId).catch((err) => {
        this.logger.error(`Error processing next item: ${err.message}`);
      });
      
      return { success: false };
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
   * Create CandidateApplication records from n8n screening results
   * Only creates for qualified matches (score >= 65 or MATCH/STRONG_MATCH)
   */
  private async createCandidateApplicationsFromScreenings(
    candidateId: string,
    screenings: { jobVacancyId: string; fitScore: number; aiMatchStatus: string; aiInsight?: string; aiInterview?: string; aiCoreValue?: string }[],
  ): Promise<void> {
    // Filter for qualified matches only
    const qualifiedScreenings = screenings.filter(
      (s) => s.fitScore >= 65 || s.aiMatchStatus !== AiMatchStatusValue.NOT_MATCH,
    );

    if (qualifiedScreenings.length === 0) {
      this.logger.log(`No qualified screenings for candidate ${candidateId}`);
      return;
    }

    // Get existing applications to avoid duplicates
    const existingApps = await this.prisma.candidateApplication.findMany({
      where: { candidateId },
      select: { jobVacancyId: true },
    });
    const existingJobIds = new Set(existingApps.map((a) => a.jobVacancyId));

    const newScreenings = qualifiedScreenings.filter((s) => !existingJobIds.has(s.jobVacancyId));

    if (newScreenings.length === 0) {
      this.logger.log(`All screenings already exist for candidate ${candidateId}`);
      return;
    }

    // Get required lookup values
    const [defaultSalary, appliedStatus, screeningPipeline, qualifiedPipelineStatus] = await Promise.all([
      this.prisma.candidateSalary.findFirst({ where: { candidateId } }),
      this.prisma.applicationLastStatus.findFirst({ where: { applicationLastStatus: 'Applied' } }),
      this.prisma.applicationPipeline.findFirst({ where: { applicationPipeline: 'Screening' } }),
      this.prisma.applicationPipelineStatus.findFirst({ where: { applicationPipelineStatus: 'Qualified' } }),
    ]);

    // Create CandidateSalary if not exists
    let salaryId = defaultSalary?.id;
    if (!salaryId) {
      const newSalary = await this.prisma.candidateSalary.create({
        data: {
          candidateId,
          currentSalary: 0,
          expectationSalary: 0,
        },
      });
      salaryId = newSalary.id;
    }

    if (!appliedStatus || !screeningPipeline || !qualifiedPipelineStatus) {
      this.logger.warn('Missing application status/pipeline records for CandidateApplication creation');
      return;
    }

    // Create applications
    for (const screening of newScreenings) {
      try {
        await this.prisma.candidateApplication.create({
          data: {
            candidateId,
            jobVacancyId: screening.jobVacancyId,
            candidateSalaryId: salaryId,
            applicationLatestStatusId: appliedStatus.id,
            applicationPipelineId: screeningPipeline.id,
            fitScore: screening.fitScore,
            aiMatchStatus: screening.aiMatchStatus as any,
            aiInsight: screening.aiInsight,
            aiInterview: screening.aiInterview,
            aiCoreValue: screening.aiCoreValue,
            submissionDate: new Date(),
            candidateApplicationPipelines: {
              create: [{
                applicationPipelineId: screeningPipeline.id,
                applicationPipelineStatusId: qualifiedPipelineStatus.id,
                notes: 'Auto-qualified from Talent Pool AI screening',
              }],
            },
          },
        });
        
        this.logger.log(`Created CandidateApplication for job ${screening.jobVacancyId}`);
      } catch (e: any) {
        this.logger.warn(`Failed to create application for job ${screening.jobVacancyId}: ${e.message}`);
      }
    }
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
  // Unified Talent Pool Candidate Creation (NEW)
  // ============================================

  /**
   * Create a unified Candidate record from talent pool n8n callback
   * Creates: User (with passwordSetRequired=true) + Candidate (isTalentPool=true) + Profile records
   */
  // Helper to safely parse dates
  private safeDate(dateStr: any): Date | null {
    if (!dateStr || dateStr === 'Present' || dateStr === 'Current') return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  async createUnifiedTalentPoolCandidate(
    batchId: string,
    candidateData: {
      fullName: string;
      email?: string;
      phone?: string;
      city?: string;
      linkedin?: string;
      education?: any[];
      workExperience?: any[];
      skills?: string[];
      certifications?: any[];
      organizationExperience?: any[];
      cvFileUrl: string;
      cvFileName: string;
    },
  ): Promise<{ userId: string; candidateId: string }> {
    // Generate random password (user will set their own via email link)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Generate email if not provided (use a placeholder)
    const candidateEmail = candidateData.email || `talent-pool-${crypto.randomBytes(8).toString('hex')}@placeholder.local`;

    // Create User + Candidate in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create User with passwordSetRequired=true
      const user = await tx.user.create({
        data: {
          email: candidateEmail,
          name: candidateData.fullName,
          password: hashedPassword,
          passwordSetRequired: true,
        },
      });

      // 2. Create Candidate
      const candidate = await tx.candidate.create({
        data: {
          userId: user.id,
          talentPoolBatchId: batchId,
          candidateFullname: candidateData.fullName,
          candidateEmail: candidateData.email || null,
          phoneNumber: candidateData.phone || null,
          cityDomicile: candidateData.city || null,
          linkedInUrl: candidateData.linkedin || null,
          cvFileUrl: candidateData.cvFileUrl,
          cvFileName: candidateData.cvFileName,
        },
      });

      return { user, candidate };
    });

    // 3. Create profile records (education, work experience, skills, etc.)
    await this.createCandidateProfileRecords(result.candidate.id, candidateData);

    this.logger.log(`Created unified talent pool candidate: ${result.candidate.id} (User: ${result.user.id})`);

    return { userId: result.user.id, candidateId: result.candidate.id };
  }

  /**
   * Create candidate profile records from n8n parsed data
   */
  private async createCandidateProfileRecords(
    candidateId: string,
    data: {
      education?: any[];
      workExperience?: any[];
      skills?: string[];
      certifications?: any[];
      organizationExperience?: any[];
    },
  ): Promise<void> {
    // Get default education level
    const defaultEducationLevel = await this.prisma.candidateLastEducation.findFirst();



    // Create education records
    if (data.education && data.education.length > 0) {
      for (const edu of data.education) {
        try {
          await this.prisma.candidateEducation.create({
            data: {
              candidateId,
              candidateLastEducationId: defaultEducationLevel?.id || '',
              candidateSchool: edu.institution || edu.university || 'Unknown',
              candidateMajor: edu.major || edu.degree || null,
              candidateGpa: edu.gpa ? parseFloat(edu.gpa) : null,
              candidateCountry: 'Indonesia',
              candidateStartedYearStudy: this.safeDate(edu.startYear),
              candidateEndedYearStudy: this.safeDate(edu.endYear),
            },
          });
        } catch (e: any) {
          this.logger.warn(`Failed to create education record: ${e.message}`);
        }
      }
    }

    // Create work experience records
    if (data.workExperience && data.workExperience.length > 0) {
      for (const work of data.workExperience) {
        try {
          await this.prisma.candidateWorkExperience.create({
            data: {
              candidateId,
              companyName: work.company || 'Unknown',
              jobTitle: work.position || work.title || 'Unknown',
              fieldOfWork: work.fieldOfWork || 'General',
              industry: work.industry || 'General',
              employmentStartedDate: this.safeDate(work.startDate) || new Date(),
              employmentEndedDate: this.safeDate(work.endDate),
              workExperienceDescription: work.description || null,
              country: 'Indonesia',
              referenceName: 'N/A',
              referencePhoneNumber: 'N/A',
              referenceRelationship: 'N/A',
            },
          });
        } catch (e: any) {
          this.logger.warn(`Failed to create work experience record: ${e.message}`);
        }
      }
    }

    // Create skill records
    this.logger.log(`[DEBUG] Creating skills for candidate ${candidateId}, skills count: ${data.skills?.length || 0}`);
    if (data.skills && data.skills.length > 0) {
      this.logger.log(`[DEBUG] Skills to create: ${JSON.stringify(data.skills)}`);
      for (const skill of data.skills) {
        try {
          const created = await this.prisma.candidateSkill.create({
            data: {
              candidateId,
              candidateSkill: skill,
              candidateRating: 'THREE' as CandidateRating, 
            },
          });
          this.logger.log(`[DEBUG] Created skill: ${skill} with id ${created.id}`);
        } catch (e: any) {
          this.logger.warn(`Failed to create skill record: ${e.message}`);
        }
      }
    } else {

      this.logger.log(`[DEBUG] No skills to create for candidate ${candidateId}`);
    }

    // Create certification records
    if (data.certifications && data.certifications.length > 0) {
      for (const cert of data.certifications) {
        try {
          await this.prisma.candidateCertification.create({
            data: {
              candidateId,
              certificationTitle: cert.name || cert.title || 'Unknown',
              institutionName: cert.issuer || cert.institution || 'Unknown',
              certificationStartDate: cert.date ? new Date(cert.date) : null,
            },
          });
        } catch (e: any) {
          this.logger.warn(`Failed to create certification record: ${e.message}`);
        }
      }
    }

    // Create organization experience records
    if (data.organizationExperience && data.organizationExperience.length > 0) {
      for (const org of data.organizationExperience) {
        try {
          await this.prisma.candidateOrganizationExperience.create({
            data: {
              candidateId,
              organizationName: org.organization || org.name || 'Unknown',
              role: org.role || org.position || 'Member',
              organizationExperienceStartedDate: org.startDate ? new Date(org.startDate) : new Date(),
              organizationExperienceEndedDate: org.endDate ? new Date(org.endDate) : null,
            },
          });
        } catch (e: any) {
          this.logger.warn(`Failed to create organization record: ${e.message}`);
        }
      }
    }
  }

  /**
   * Update profile data for existing candidate (add missing skills, education, etc.)
   * This is called when a duplicate candidate is detected to ensure their profile is complete
   */
  private async updateCandidateProfileData(
    candidateId: string,
    data: {
      skills?: string[];
      education?: any[];
      workExperience?: any[];
      certifications?: any[];
      organizationExperience?: any[];
    },
  ): Promise<void> {
    this.logger.log(`Updating profile data for candidate: ${candidateId}`);

    // Get existing skills to avoid duplicates
    const existingSkills = await this.prisma.candidateSkill.findMany({
      where: { candidateId },
      select: { candidateSkill: true },
    });
    const existingSkillNames = new Set(
      existingSkills.map((s) => s.candidateSkill.toLowerCase().trim()),
    );

    // Add new skills that don't exist
    if (data.skills && data.skills.length > 0) {
      for (const skill of data.skills) {
        const skillLower = skill.toLowerCase().trim();
        if (!existingSkillNames.has(skillLower)) {
          try {
            await this.prisma.candidateSkill.create({
              data: {
                candidateId,
                candidateSkill: skill,
                candidateRating: 'THREE' as CandidateRating,
              },
            });
            existingSkillNames.add(skillLower);
            this.logger.log(`Added skill: ${skill} for candidate ${candidateId}`);
          } catch (e: any) {
            this.logger.warn(`Failed to add skill ${skill}: ${e.message}`);
          }
        }
      }
    }

    // Get default education level for new education records
    const defaultEducationLevel = await this.prisma.candidateLastEducation.findFirst();

    // Get existing education to check for duplicates
    const existingEducation = await this.prisma.candidateEducation.findMany({
      where: { candidateId },
      select: { candidateSchool: true },
    });
    const existingSchools = new Set(
      existingEducation.map((e) => e.candidateSchool?.toLowerCase().trim()),
    );

    // Add new education records
    if (data.education && data.education.length > 0) {
      for (const edu of data.education) {
        const schoolLower = (edu.institution || '')?.toLowerCase().trim();
        if (schoolLower && !existingSchools.has(schoolLower)) {
          try {
            await this.prisma.candidateEducation.create({
              data: {
                candidateId,
                candidateLastEducationId: defaultEducationLevel?.id || '',
                candidateSchool: edu.institution || 'Unknown',
                candidateMajor: edu.major || edu.degree || 'General',
                candidateGpa: edu.gpa || 'N/A',
                candidateStartedYearStudy: this.safeDate(edu.startYear),
                candidateEndedYearStudy: this.safeDate(edu.endYear),
                candidateCountry: 'Indonesia',
              },
            });
            existingSchools.add(schoolLower);
          } catch (e: any) {
            this.logger.warn(`Failed to add education: ${e.message}`);
          }
        }
      }
    }

    // Get existing work experience
    const existingWork = await this.prisma.candidateWorkExperience.findMany({
      where: { candidateId },
      select: { companyName: true, jobTitle: true },
    });
    const existingWorkKeys = new Set(
      existingWork.map(
        (w) => `${w.companyName?.toLowerCase().trim()}-${w.jobTitle?.toLowerCase().trim()}`,
      ),
    );

    // Add new work experience records
    if (data.workExperience && data.workExperience.length > 0) {
      for (const work of data.workExperience) {
        const workKey = `${(work.company || '').toLowerCase().trim()}-${(work.position || '').toLowerCase().trim()}`;
        if (!existingWorkKeys.has(workKey)) {
          try {
            await this.prisma.candidateWorkExperience.create({
              data: {
                candidateId,
                companyName: work.company || 'Unknown',
                jobTitle: work.position || work.title || 'Unknown',
                fieldOfWork: work.fieldOfWork || 'General',
                industry: work.industry || 'General',
                employmentStartedDate: this.safeDate(work.startDate) || new Date(),
                employmentEndedDate: this.safeDate(work.endDate),
                workExperienceDescription: work.description || null,
                country: 'Indonesia',
                referenceName: 'N/A',
                referencePhoneNumber: 'N/A',
                referenceRelationship: 'N/A',
              },
            });
            existingWorkKeys.add(workKey);
          } catch (e: any) {
            this.logger.warn(`Failed to add work experience: ${e.message}`);
          }
        }
      }
    }

    // Get existing certifications
    const existingCerts = await this.prisma.candidateCertification.findMany({
      where: { candidateId },
      select: { certificationTitle: true },
    });
    const existingCertTitles = new Set(
      existingCerts.map((c) => c.certificationTitle?.toLowerCase().trim()),
    );

    // Add new certifications
    if (data.certifications && data.certifications.length > 0) {
      for (const cert of data.certifications) {
        const certLower = (cert.name || cert.title || '').toLowerCase().trim();
        if (certLower && !existingCertTitles.has(certLower)) {
          try {
            await this.prisma.candidateCertification.create({
              data: {
                candidateId,
                certificationTitle: cert.name || cert.title || 'Unknown',
                institutionName: cert.issuer || cert.institution || 'Unknown',
                certificationStartDate: this.safeDate(cert.date),
              },
            });
            existingCertTitles.add(certLower);
          } catch (e: any) {
            this.logger.warn(`Failed to add certification: ${e.message}`);
          }
        }
      }
    }

    // Get existing organization experience
    const existingOrgs = await this.prisma.candidateOrganizationExperience.findMany({
      where: { candidateId },
      select: { organizationName: true },
    });
    const existingOrgNames = new Set(
      existingOrgs.map((o) => o.organizationName?.toLowerCase().trim()),
    );

    // Add new organization experience
    if (data.organizationExperience && data.organizationExperience.length > 0) {
      for (const org of data.organizationExperience) {
        const orgLower = (org.organization || org.name || '').toLowerCase().trim();
        if (orgLower && !existingOrgNames.has(orgLower)) {
          try {
            await this.prisma.candidateOrganizationExperience.create({
              data: {
                candidateId,
                organizationName: org.organization || org.name || 'Unknown',
                role: org.role || org.position || 'Member',
                organizationExperienceStartedDate: this.safeDate(org.startDate) || new Date(),
                organizationExperienceEndedDate: this.safeDate(org.endDate),
              },
            });
            existingOrgNames.add(orgLower);
          } catch (e: any) {
            this.logger.warn(`Failed to add organization: ${e.message}`);
          }
        }
      }
    }

    this.logger.log(`Profile data update completed for candidate: ${candidateId}`);
  }

  /**
   * Convert talent pool candidate to active recruitment pipeline
   * Sets isTalentPool=false, updates pipeline stage, and sends password setup email
   */
  async convertToActivePipeline(
    candidateId: string,
    targetPipelineStage: 'HR Interview' | 'User Interview' | 'Online Assessment',
    targetApplicationIds?: string[],
  ): Promise<{
    success: boolean;
    resetToken: string;
    resetLink: string;
    message: string;
  }> {
    // Find candidate with isTalentPool=true
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { 
        user: true,
        applications: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    // Note: No longer checking candidate.isTalentPool since it's now per-application
    // Each application has its own isTalentPool flag


    // Get target pipeline stage
    const targetPipeline = await this.prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: targetPipelineStage },
    });

    if (!targetPipeline) {
      throw new NotFoundException(`Pipeline stage "${targetPipelineStage}" not found`);
    }

    // Get "On Progress" status for the pipeline
    const onProgressStatus = await this.prisma.applicationPipelineStatus.findFirst({
      where: { applicationPipelineStatus: 'On Progress' },
    });

    if (!onProgressStatus) {
      throw new NotFoundException('Pipeline status "On Progress" not found');
    }

    // Generate password reset token (24 hours validity)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Determine applications to update
    let applicationsToUpdate = candidate.applications;
    
    if (targetApplicationIds && targetApplicationIds.length > 0) {
      applicationsToUpdate = candidate.applications.filter(app => targetApplicationIds.includes(app.id));
    }

    if (applicationsToUpdate.length === 0) {
        this.logger.warn(`No applications matched for conversion for candidate ${candidateId}`);
    }

    // Update in transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Check if this is the first time converting ANY application for this candidate
      const hasActiveApps = await tx.candidateApplication.count({
        where: {
          candidateId: candidateId,
          isTalentPool: false,
        },
      });

      // 2. If first conversion, set up password reset for the user
      if (hasActiveApps === 0) {
        await tx.user.update({
            where: { id: candidate.userId },
            data: {
              passwordResetToken: resetToken,
              passwordResetExpiry: resetExpiry,
            },
        });
      }

      // 3. Update TARGET applications - set isTalentPool = false and update pipeline
      for (const application of applicationsToUpdate) {
        await tx.candidateApplication.update({
          where: { id: application.id },
          data: {
            isTalentPool: false, // Mark this specific application as Active
            applicationPipelineId: targetPipeline.id,
          },
        });

        // Add pipeline history record
        await tx.candidateApplicationPipeline.create({
          data: {
            candidateApplicationId: application.id,
            applicationPipelineId: targetPipeline.id,
            applicationPipelineStatusId: onProgressStatus.id,
            notes: `Converted from Talent Pool to ${targetPipelineStage}`,
          },
        });
      }
    });

    // Build reset link
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/set-password?token=${resetToken}`;

    this.logger.log(`Converted talent pool candidate ${candidateId} to ${targetPipelineStage} (${applicationsToUpdate.length} apps)`);

    // Send talent pool welcome email with profile completion reminder
    // Check if this is first time converting any application for this candidate
    const wasFirstConversion = await this.prisma.candidateApplication.count({
      where: {
        candidateId: candidateId,
        isTalentPool: false,
      },
    }) === applicationsToUpdate.length; // If count equals what we just converted, those are the first

    if (wasFirstConversion) {
        try {
        // Get job title from first target application if available
        const jobTitle = applicationsToUpdate[0] ? 
            (await this.prisma.jobVacancy.findUnique({
            where: { id: applicationsToUpdate[0].jobVacancyId },
            include: { jobRole: true },
            }))?.jobRole?.jobRoleName : undefined;

        await this.emailService.sendTalentPoolWelcomeEmail(
            candidate.user.email,
            candidate.candidateFullname || 'Candidate',
            resetToken,
            targetPipelineStage,
            jobTitle,
        );
        
        this.logger.log(`Talent pool welcome email sent to ${candidate.user.email}`);
        } catch (error: any) {
        this.logger.error(`Failed to send email: ${error.message}`);
        }
    }

    return {
      success: true,
      resetToken,
      resetLink,
      message: `Candidate converted to ${targetPipelineStage}. Password setup email sent.`,
    };
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

  /**
   * Get unified talent pool candidates from Candidate table
   * Returns candidates where isTalentPool=true with full profile data
   */
  async getUnifiedTalentPoolCandidates(params: {
    skip?: number;
    take?: number;
    batchId?: string;
  }): Promise<{ candidates: any[]; total: number }> {
    const { skip = 0, take = 20, batchId } = params;

    // Query applications that are in talent pool
    const whereClause: any = {
      isTalentPool: true,
    };

    if (batchId) {
      whereClause.candidate = {
        talentPoolBatchId: batchId,
      };
    }

    // Get ALL applications first (Flattened Rows) to determine matches and total
    const allApplications = await this.prisma.candidateApplication.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: { 
          id: true, 
          candidateId: true 
      }
    });

    const total = allApplications.length;

    // Identify the IDs for the current page
    const pagedAppIds = allApplications
        .slice(skip, skip + take)
        .map(app => app.id);

    if (pagedAppIds.length === 0) {
        return { candidates: [], total };
    }

    // Now fetch full data ONLY for these applications
    const pagedApplications = await this.prisma.candidateApplication.findMany({
      where: {
        id: { in: pagedAppIds }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                passwordSetRequired: true,
              },
            },
            talentPoolBatch: {
              select: {
                id: true,
                batchName: true,
                status: true,
              },
            },
            educations: true,
            workExperiences: true,
            skills: true,
            certifications: true,
            organizationExperiences: true,
          },
        },
        jobVacancy: {
          select: {
            id: true,
            jobRole: {
              select: { jobRoleName: true },
            },
          },
        },
      },
    });

    // Group applications by candidate for the response
    const candidateMap = new Map<string, any>();
    
    // We must iterate through pagedAppIds to maintain the sort order (createdAt desc)
    // findMany result order is not guaranteed to match 'in' array order
    // So we sort the result to match pagedAppIds order OR rely on order by createdAt desc which we added
    
    for (const app of pagedApplications) {
      const candidateId = app.candidateId;
      
      if (!candidateMap.has(candidateId)) {
        candidateMap.set(candidateId, {
          ...app.candidate,
          applications: [],
        });
      }
      
      candidateMap.get(candidateId).applications.push({
        id: app.id,
        fitScore: app.fitScore,
        aiMatchStatus: app.aiMatchStatus,
        aiInsight: app.aiInsight,
        aiInterview: app.aiInterview,
        aiCoreValue: app.aiCoreValue,
        jobVacancyId: app.jobVacancyId,
        jobVacancy: app.jobVacancy,
        isTalentPool: app.isTalentPool,
      });
    }

    const groupedCandidates = Array.from(candidateMap.values());
    
    return { candidates: groupedCandidates, total: total };
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
