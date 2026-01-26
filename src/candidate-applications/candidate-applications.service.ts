import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import axios from 'axios';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { DashboardSummaryDto } from './dto/application-response.dto';
import { AiMatchStatus } from '@prisma/client';

@Injectable()
export class CandidateApplicationsService {
  private readonly logger = new Logger(CandidateApplicationsService.name);
  private readonly n8nWebhookUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.n8nWebhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL') || '';
  }

  /**
   * NEW: Trigger AI Analysis by candidateId + selectedTracks
   * This is the preferred method for frontend integration.
   */
  async triggerAiAnalysisByCandidate(candidateId: string, selectedTracks: string[]) {
    this.logger.log(`Triggering AI Analysis for candidate: ${candidateId}`);
    this.logger.log(`Selected tracks: ${selectedTracks.join(', ')}`);

    // 1. Fetch full candidate data
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: true,
        educations: { include: { candidateLastEducation: true } },
        workExperiences: true,
        organizationExperiences: true,
        skills: true,
        certifications: true,
        salaries: true,
      },
    });

    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    const startTime = Date.now();

    // 2. Build structured payload (NO cvText to save tokens)
    const candidateProfile = {
      fullName: candidate.candidateFullname || candidate.user.name,
      email: candidate.candidateEmail || candidate.user.email,
      phone: candidate.phoneNumber || '',
      education: candidate.educations.map((e: any) => ({
        school: e.candidateSchool,
        degree: e.candidateLastEducation?.candidateEducation || '',
        major: e.candidateMajor || '',
        gpa: e.candidateGpa ? parseFloat(e.candidateGpa.toString()) : null,
        startYear: e.candidateStartedYearStudy?.getFullYear() || null,
        endYear: e.candidateEndedYearStudy?.getFullYear() || null,
      })),
      workExperience: candidate.workExperiences.map((w: any) => ({
        company: w.companyName,
        position: w.jobTitle,
        fieldOfWork: w.fieldOfWork,
        industry: w.industry,
        startDate: w.employmentStartedDate,
        endDate: w.employmentEndedDate,
        description: w.workExperienceDescription || '',
      })),
      organizationExperience: candidate.organizationExperiences.map((o: any) => ({
        organization: o.organizationName,
        role: o.role,
        startDate: o.organizationExperienceStartedDate,
        endDate: o.organizationExperienceEndedDate,
        description: o.organizationExperienceDescription || '',
      })),
      skills: candidate.skills.map((s: any) => s.candidateSkill),
      certifications: candidate.certifications.map((c: any) => ({
        title: c.certificationTitle,
        institution: c.institutionName,
        startDate: c.certificationStartDate,
        endDate: c.certificationEndedDate,
      })),
    };

    const payload = {
      candidate_id: candidateId,
      candidate: candidateProfile,
      selectedTracks: selectedTracks,
    };

    // Detailed logging to verify data is being sent
    this.logger.log(`Sending payload to n8n:`);
    this.logger.log(`  - Education entries: ${candidateProfile.education.length}`);
    this.logger.log(`  - Work experience entries: ${candidateProfile.workExperience.length}`);
    this.logger.log(`  - Organization entries: ${candidateProfile.organizationExperience.length}`);
    this.logger.log(`  - Skills: ${candidateProfile.skills.length}`);
    this.logger.log(`  - Certifications: ${candidateProfile.certifications.length}`);

    // 3. Send to n8n
    try {
      if (!this.n8nWebhookUrl) {
        throw new Error('N8N_WEBHOOK_URL is not defined');
      }

      const response = await axios.post(this.n8nWebhookUrl, payload);
      this.logger.log(`n8n Response: ${JSON.stringify(response.data)}`);

      const data = response.data;
      
      let analysisResults: any[] = [];
      
      // Handle various n8n response formats
      if (Array.isArray(data)) {
        // Case 1: Array of objects (Standard n8n output)
        // Check if items are wrapped in "results" property
        analysisResults = data.map(item => item.results || item);
        
        // Flatten if "results" was an array itself
        analysisResults = analysisResults.flat();
      } else if (data.results && Array.isArray(data.results)) {
        // Case 2: Object with "results" array
        analysisResults = data.results;
      } else {
        // Case 3: Single object
        analysisResults = [data];
      }

      console.log(`[DEBUG] Processed ${analysisResults.length} analysis results from n8n`);

      // 4. Create or update CandidateApplication for each result
      for (const result of analysisResults) {
        if (!result.job_id) continue;

        // Find or create application
        let application = await this.prisma.candidateApplication.findFirst({
          where: {
            candidateId: candidateId,
            jobVacancyId: result.job_id,
          },
        });

        // Map AI Match Status
        let aiMatchStatus = result.aiMatchStatus || result.ai_match_status || 'NOT_MATCH';
        if (typeof aiMatchStatus === 'string') {
          const statusUpper = aiMatchStatus.toUpperCase();
          if (statusUpper === 'PASS' || statusUpper === 'STRONG MATCH' || statusUpper === 'STRONG_MATCH') aiMatchStatus = 'STRONG_MATCH';
          else if (statusUpper === 'PARTIALLY PASS' || statusUpper === 'PARTIALLY_PASS' || statusUpper === 'MATCH') aiMatchStatus = 'MATCH';
          else aiMatchStatus = 'NOT_MATCH';
        }

        const updateData = {
          fitScore: result.fit_score || 0,
          aiInsight: result.ai_insight || result.summary || '',
          aiInterview: result.ai_interview || '',
          aiCoreValue: result.ai_core_value || '',
          aiMatchStatus: aiMatchStatus,
        };

        if (application) {
          await this.prisma.candidateApplication.update({
            where: { id: application.id },
            data: updateData as any,
          });
        } else {
          // Get or create required records for new application
          
          // 1. Get or create CandidateSalary
          let candidateSalary = await this.prisma.candidateSalary.findFirst({
            where: { candidateId: candidateId },
          });
          if (!candidateSalary) {
            candidateSalary = await this.prisma.candidateSalary.create({
              data: {
                candidateId: candidateId,
                currentSalary: null,
                expectationSalary: null,
              },
            });
          }

          // 2. Get default ApplicationLastStatus (e.g., "PASSED" or first available)
          let appLastStatus = await this.prisma.applicationLastStatus.findFirst({
            where: { applicationLastStatus: 'PARTIALLY PASSED' },
          });
          if (!appLastStatus) {
            appLastStatus = await this.prisma.applicationLastStatus.findFirst();
          }
          if (!appLastStatus) {
            throw new Error('No ApplicationLastStatus found in database. Run seed script.');
          }

          // 3. Get default ApplicationPipeline (e.g., "AI SCREENING" or first available)
          let appPipeline = await this.prisma.applicationPipeline.findFirst({
            where: { applicationPipeline: 'AI SCREENING' },
          });
          if (!appPipeline) {
            appPipeline = await this.prisma.applicationPipeline.findFirst();
          }
          if (!appPipeline) {
            throw new Error('No ApplicationPipeline found in database. Run seed script.');
          }

          // Create new application with all required fields
          application = await this.prisma.candidateApplication.create({
            data: {
              candidateId: candidateId,
              jobVacancyId: result.job_id,
              candidateSalaryId: candidateSalary.id,
              applicationLatestStatusId: appLastStatus.id,
              applicationPipelineId: appPipeline.id,
              submissionDate: new Date(),
              ...updateData,
            } as any,
          });
        }

        // --- SKILL MATCHING LOGIC ---
        try {
          const jobSkills = await this.prisma.jobVacancySkill.findMany({
            where: { jobVacancyId: result.job_id },
            include: { skill: true }
          });

          const candidateSkills = await this.prisma.candidateSkill.findMany({
            where: { candidateId: candidateId }
          });

          const matchedSkills = new Set<string>();
          
          // Helper to escape regex special characters
          const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          };

          for (const js of jobSkills) {
            if (!js.skill?.skillName) continue;
            const jName = js.skill.skillName.toLowerCase().trim();
            
            for (const cs of candidateSkills) {
              if (!cs.candidateSkill) continue;
              const cName = cs.candidateSkill.toLowerCase().trim();
              
              // 1. Exact match
              if (jName === cName) {
                matchedSkills.add(js.skill.skillName);
                break;
              }

              // 2. Partial match (Job contains Candidate Skill)
              // e.g. Job: "Cloud Computing", Candidate: "Cloud"
              if (jName.includes(cName)) {
                // For short skills (<=3 chars), enforce word boundary to avoid "C" matches "Cloud"
                if (cName.length > 3 || new RegExp(`\\b${escapeRegExp(cName)}\\b`, 'i').test(jName)) {
                  matchedSkills.add(js.skill.skillName);
                  break;
                }
              }

              // 3. Partial match (Candidate contains Job Skill)
              // e.g. Job: "Docker", Candidate: "Docker Container"
              if (cName.includes(jName)) {
                // For short skills (<=3 chars), enforce word boundary
                if (jName.length > 3 || new RegExp(`\\b${escapeRegExp(jName)}\\b`, 'i').test(cName)) {
                  matchedSkills.add(js.skill.skillName);
                  break;
                }
              }
            }
          }

          // Update CandidateMatchSkill table
          await this.prisma.candidateMatchSkill.deleteMany({
            where: { candidateApplicationId: application.id }
          });

          if (matchedSkills.size > 0) {
            await this.prisma.candidateMatchSkill.createMany({
              data: Array.from(matchedSkills).map(skillName => ({
                candidateId: candidateId,
                candidateApplicationId: application.id,
                candidateMatchSkill: skillName
              }))
            });
          }
        } catch (error) {
          this.logger.error(`Error calculating matched skills for job ${result.job_id}:`, error);
        }
        // --- END SKILL MATCHING LOGIC ---
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.log(`AI Analysis completed in ${duration}ms`);

      return { 
        candidate_id: candidateId,
        results: analysisResults,
        processing_time_ms: duration 
      };
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.error(`Error triggering n8n (Duration: ${duration}ms): ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new candidate application
   * Business rules:
   * - One application per job per candidate (returns existing if already applied)
   * - 6-month cooldown after rejection for NEW jobs
   * - Auto-qualification based on AI match status
   */
  async createApplication(candidateId: string, dto: CreateApplicationDto) {
    // 1. Check for existing application for this SAME job
    const existingApplicationForJob = await this.prisma.candidateApplication.findFirst({
      where: { 
        candidateId, 
        jobVacancyId: dto.jobVacancyId 
      },
      include: {
        jobVacancy: {
          include: {
            jobRole: true,
            employeePosition: true,
            division: true,
            department: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
        candidateApplicationPipelines: {
          include: {
            applicationPipeline: true,
            applicationPipelineStatus: true,
            interviewer: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // If already applied for this job, return the existing application (has AI data)
    if (existingApplicationForJob) {
      this.logger.log(`Returning existing application ${existingApplicationForJob.id} with AI data`);
      return existingApplicationForJob;
    }

    // 2. Check 6-month cooldown for any job (only for rejected applications)
    const recentRejectedApp = await this.prisma.candidateApplication.findFirst({
      where: { 
        candidateId,
        applicationLastStatus: {
          applicationLastStatus: 'Not Qualified'
        }
      },
      orderBy: { submissionDate: 'desc' }
    });

    if (recentRejectedApp) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (recentRejectedApp.submissionDate > sixMonthsAgo) {
        const canApplyAgain = new Date(recentRejectedApp.submissionDate);
        canApplyAgain.setMonth(canApplyAgain.getMonth() + 6);
        throw new BadRequestException(
          `You were rejected from a recent application. You can apply again after ${canApplyAgain.toLocaleDateString()}`
        );
      }
    }

    // 2. Validate job exists and is open
    const jobVacancy = await this.prisma.jobVacancy.findUnique({
      where: { id: dto.jobVacancyId },
      include: { jobVacancyStatus: true },
    });

    if (!jobVacancy) {
      throw new NotFoundException(`Job vacancy not found: ${dto.jobVacancyId}`);
    }

    // Check if job is open (you may need to adjust this based on your status naming)
    if (jobVacancy.jobVacancyStatus.jobVacancyStatus !== 'OPEN') {
      throw new BadRequestException('This job vacancy is no longer open for applications');
    }

    // 3. Check AI analysis exists for this candidate and job
    // Note: AI analysis should have been done beforehand via triggerAiAnalysisByCandidate
    // We'll create the application anyway, but it should have fitScore and aiMatchStatus

    // 4. Get candidate salary
    let candidateSalary = await this.prisma.candidateSalary.findFirst({
      where: { candidateId },
    });

    if (!candidateSalary) {
      candidateSalary = await this.prisma.candidateSalary.create({
        data: { candidateId, currentSalary: null, expectationSalary: null },
      });
    }

    // 5. Get pipeline stages and statuses
    const appliedStage = await this.prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: 'Applied' },
    });
    const screeningStage = await this.prisma.applicationPipeline.findFirst({
      where: { applicationPipeline: 'Screening' },
    });
    const qualifiedStatus = await this.prisma.applicationLastStatus.findFirst({
      where: { applicationLastStatus: 'Qualified' },
    });
    const notQualifiedStatus = await this.prisma.applicationLastStatus.findFirst({
      where: { applicationLastStatus: 'Not Qualified' },
    });
    const qualifiedPipelineStatus = await this.prisma.applicationPipelineStatus.findFirst({
      where: { applicationPipelineStatus: 'Qualified' },
    });
    const notQualifiedPipelineStatus = await this.prisma.applicationPipelineStatus.findFirst({
      where: { applicationPipelineStatus: 'Not Qualified' },
    });

    if (!appliedStage || !screeningStage || !qualifiedStatus || !notQualifiedStatus ||
        !qualifiedPipelineStatus || !notQualifiedPipelineStatus) {
      throw new Error('Required pipeline stages or statuses not found. Please run seed scripts.');
    }

    // 6. Determine match status (default to NOT_MATCH if not analyzed yet)
    let aiMatchStatus = 'NOT_MATCH';
    let fitScore: number | null = null;
    let aiInsight: string | null = null;

    // Try to find existing AI analysis
    const existingAnalysis = await this.prisma.candidateApplication.findFirst({
      where: {
        candidateId,
        jobVacancyId: dto.jobVacancyId,
      },
      select: { aiMatchStatus: true, fitScore: true, aiInsight: true },
    });

    if (existingAnalysis) {
      aiMatchStatus = existingAnalysis.aiMatchStatus || 'NOT_MATCH';
      fitScore = existingAnalysis.fitScore ? parseFloat(existingAnalysis.fitScore.toString()) : null;
      aiInsight = existingAnalysis.aiInsight;
    }

    const isQualified = aiMatchStatus === 'STRONG_MATCH' || aiMatchStatus === 'MATCH';

    // 7. Create application
    const application = await this.prisma.candidateApplication.create({
      data: {
        candidateId,
        jobVacancyId: dto.jobVacancyId,
        candidateSalaryId: candidateSalary.id,
        applicationLatestStatusId: isQualified ? qualifiedStatus.id : notQualifiedStatus.id,
        applicationPipelineId: isQualified ? screeningStage.id : appliedStage.id,
        fitScore: fitScore,
        aiInsight: aiInsight,
       aiMatchStatus: aiMatchStatus as any,
        submissionDate: new Date(),
      },
    });

    // 8. Create pipeline entries based on match status
    if (isQualified) {
      // Create two entries: Applied (Qualified) and Screening (Qualified)
      await this.prisma.candidateApplicationPipeline.createMany({
        data: [
          {
            candidateApplicationId: application.id,
            applicationPipelineId: appliedStage.id,
            applicationPipelineStatusId: qualifiedPipelineStatus.id,
            notes: 'Automatically qualified based on AI screening',
          },
          {
            candidateApplicationId: application.id,
            applicationPipelineId: screeningStage.id,
            applicationPipelineStatusId: qualifiedPipelineStatus.id,
            notes: 'Automatically qualified based on AI screening',
          },
        ],
      });
    } else {
      // Create one entry: Applied (Not Qualified)
      await this.prisma.candidateApplicationPipeline.create({
        data: {
          candidateApplicationId: application.id,
          applicationPipelineId: appliedStage.id,
          applicationPipelineStatusId: notQualifiedPipelineStatus.id,
          notes: 'Did not meet qualification criteria',
        },
      });
    }

    // 9. Return application with relations
    return this.prisma.candidateApplication.findUnique({
      where: { id: application.id },
      include: {
        jobVacancy: {
          include: {
            jobRole: true,
            employeePosition: true,
            division: true,
            department: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
        candidateApplicationPipelines: {
          include: {
            applicationPipeline: true,
            applicationPipelineStatus: true,
            interviewer: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Update application status with optional scheduling
   * Sends email notification to candidate based on pipeline status
   */
  async updateApplicationStatus(applicationId: string, dto: UpdateApplicationStatusDto) {
    // 1. Validate application exists with candidate and job info
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        jobVacancy: {
          include: { jobRole: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application not found: ${applicationId}`);
    }

    // 2. Validate pipeline and status exist
    const pipeline = await this.prisma.applicationPipeline.findUnique({
      where: { id: dto.applicationPipelineId },
    });
    const pipelineStatus = await this.prisma.applicationPipelineStatus.findUnique({
      where: { id: dto.applicationPipelineStatusId },
    });

    if (!pipeline || !pipelineStatus) {
      throw new BadRequestException('Invalid pipeline or status ID');
    }

    // 3. Create new pipeline entry with scheduling data
    await this.prisma.candidateApplicationPipeline.create({
      data: {
        candidateApplicationId: applicationId,
        applicationPipelineId: dto.applicationPipelineId,
        applicationPipelineStatusId: dto.applicationPipelineStatusId,
        notes: dto.notes,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        scheduledStartTime: dto.scheduledStartTime ? new Date(dto.scheduledStartTime) : null,
        scheduledEndTime: dto.scheduledEndTime ? new Date(dto.scheduledEndTime) : null,
        link: dto.link,
        location: dto.location,
        stageScore: dto.stageScore,
        interviewerId: dto.interviewerId,
      },
    });

    // 4. Update main application record
    await this.prisma.candidateApplication.update({
      where: { id: applicationId },
      data: {
        applicationPipelineId: dto.applicationPipelineId,
        applicationLatestStatusId: dto.applicationPipelineStatusId,
      },
    });

    // 5. Send email notification based on status
    const candidateName = application.candidate.candidateFullname || application.candidate.user.name || 'Candidate';
    const candidateEmail = application.candidate.candidateEmail || application.candidate.user.email;
    const jobTitle = application.jobVacancy.jobRole?.jobRoleName || 'Position';
    const stageName = pipeline.applicationPipeline;
    const statusName = pipelineStatus.applicationPipelineStatus;

    try {
      if (statusName === 'Not Qualified') {
        // Send rejection email
        await this.emailService.sendRejectionEmail(
          candidateEmail,
          candidateName,
          jobTitle,
          dto.notes,
        );
        this.logger.log(`Rejection email sent to ${candidateEmail}`);
      } else if (statusName === 'Qualified' || statusName === 'On Progress') {
        // Send pipeline update email (congrats, moving to next stage)
        await this.emailService.sendPipelineUpdateEmail(
          candidateEmail,
          candidateName,
          jobTitle,
          stageName,
          dto.link,
          dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
          dto.notes,
        );
        this.logger.log(`Pipeline update email sent to ${candidateEmail} for ${stageName}`);
      }
    } catch (emailError: any) {
      this.logger.error(`Failed to send email: ${emailError.message}`);
      // Don't throw - application is already updated, just log the error
    }

    // 6. Return updated application with full history
    return this.getApplicationWithHistory(applicationId);
  }

  /**
   * Get application with full pipeline history
   */
  private async getApplicationWithHistory(applicationId: string) {
    return this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        jobVacancy: {
          include: {
            jobRole: true,
            employeePosition: true,
            division: true,
            department: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
        candidateApplicationPipelines: {
          include: {
            applicationPipeline: true,
            applicationPipelineStatus: true,
            interviewer: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get candidate's application (max 1 due to business rule)
   */
  async findAllByCandidate(candidateId: string) {
    const application = await this.prisma.candidateApplication.findFirst({
      where: { candidateId },
      include: {
        jobVacancy: {
          include: {
            jobRole: true,
            employeePosition: true,
            division: true,
            department: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
        candidateApplicationPipelines: {
          include: {
            applicationPipeline: true,
            applicationPipelineStatus: true,
            interviewer: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return application; // Returns null if no application
  }

  /**
   * Get recruitment process detail for HR
   */
  async getRecruitmentProcess(applicationId: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        jobVacancy: {
          include: {
            jobRole: true,
            employeePosition: true,
          },
        },
        candidateApplicationPipelines: {
          include: {
            applicationPipeline: true,
            applicationPipelineStatus: true,
            interviewer: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application not found: ${applicationId}`);
    }

    return application;
  }

  /**
   * Get HR dashboard summary metrics
   */
  async getHRDashboardSummary(): Promise<DashboardSummaryDto> {
    const nonTalentPoolFilter = {
      isTalentPool: false, // Filter at application level
    };

    const [total, pass, partiallyPass, notPass] = await Promise.all([
      this.prisma.candidateApplication.count({ where: nonTalentPoolFilter }),
      this.prisma.candidateApplication.count({
        where: { ...nonTalentPoolFilter, aiMatchStatus: 'STRONG_MATCH' as any }, // Enforce enum string format
      }),
      this.prisma.candidateApplication.count({
        where: { ...nonTalentPoolFilter, aiMatchStatus: 'MATCH' as any },
      }),
      this.prisma.candidateApplication.count({
        where: { ...nonTalentPoolFilter, aiMatchStatus: 'NOT_MATCH' as any },
      }),
    ]);

    return {
      totalCandidates: total,
      passCandidates: pass,
      partiallyPassCandidates: partiallyPass,
      notPassCandidates: notPass,
    };
  }

  /**
   * Find all applications with HR filters
   */
  async findAll(filters?: {
    aiMatchStatus?: string;
    pipelineId?: string;
    statusId?: string;
    search?: string;
  }) {
    const where: any = {
      // Filter at application level - only show active (non-talent-pool) applications
      isTalentPool: false,
    };

    if (filters?.aiMatchStatus) {
      where.aiMatchStatus = filters.aiMatchStatus;
    }
    if (filters?.pipelineId) {
      where.applicationPipelineId = filters.pipelineId;
    }
    if (filters?.statusId) {
      where.applicationLatestStatusId = filters.statusId;
    }
    if (filters?.search) {
      where.OR = [
        {
          candidate: {
            candidateFullname: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          candidate: {
            user: {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    return this.prisma.candidateApplication.findMany({
      where,
      include: {
        candidate: {
          include: {
            user: { select: { name: true, email: true } },
            religion: true,
            maritalStatus: true,
            gender: true,
            nationality: true,
          },
        },
        jobVacancy: {
          include: {
            jobRole: true,
            jobVacancyStatus: true,
            directorate: true,
            group: true,
            division: true,
            department: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
        candidateSalary: true,
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });
  }

  /**
   * Get all candidates filtered by qualification status
   * Qualified = MATCH or STRONG_MATCH (from AI screening)
   * Not Qualified = NOT_MATCH
   */
  async findAllByQualification(filters?: {
    qualified?: boolean;
    jobVacancyId?: string;
    pipelineId?: string;
    search?: string;
  }) {
    const where: any = {};

    // Filter by qualification based on aiMatchStatus
    if (filters?.qualified !== undefined) {
      if (filters.qualified) {
        // Qualified candidates: MATCH or STRONG_MATCH
        where.aiMatchStatus = { in: ['MATCH', 'STRONG_MATCH'] };
      } else {
        // Not qualified candidates
        where.aiMatchStatus = 'NOT_MATCH';
      }
    }

    if (filters?.jobVacancyId) {
      where.jobVacancyId = filters.jobVacancyId;
    }

    if (filters?.pipelineId) {
      where.applicationPipelineId = filters.pipelineId;
    }

    if (filters?.search) {
      where.OR = [
        {
          candidate: {
            candidateFullname: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          candidate: {
            user: {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          candidate: {
            candidateEmail: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Exclude talent pool candidates (only regular candidates)
    where.candidate = {
      ...where.candidate,
      isTalentPool: false,
    };

    return this.prisma.candidateApplication.findMany({
      where,
      include: {
        candidate: {
          include: {
            user: { select: { name: true, email: true } },
            religion: true,
            maritalStatus: true,
            gender: true,
            nationality: true,
          },
        },
        jobVacancy: {
          include: {
            jobRole: true,
            jobVacancyStatus: true,
            directorate: true,
            group: true,
            division: true,
            department: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
        candidateSalary: true,
      },
      orderBy: [
        { aiMatchStatus: 'asc' }, // MATCH/STRONG_MATCH first
        { fitScore: 'desc' },
        { submissionDate: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            user: true,
            educations: { include: { candidateLastEducation: true } },
            workExperiences: true,
            skills: true,
            documents: { include: { documentType: true } },
            religion: true,
            maritalStatus: true,
            gender: true,
            nationality: true
          },
        },
        jobVacancy: {
          include: {
            jobRole: true,
            department: true,
            division: true,
            directorate: true,
            group: true,
            employmentType: true,
          },
        },
        applicationPipeline: true,
        applicationLastStatus: true,
      },
    });

    if (!application) {
      throw new Error(`Application not found: ${id}`);
    }

    return application;
  }


  async triggerAiAnalysis(applicationId: string) {
    this.logger.log(`Triggering AI Analysis for application: ${applicationId}`);

    // 1. Fetch Application Details
    const application = await this.prisma.candidateApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: {
          include: {
            user: true,
            educations: { include: { candidateLastEducation: true } },
            workExperiences: true,
            skills: true,
            documents: { include: { documentType: true } },
          },
        },
        jobVacancy: {
          include: {
            department: true,
            division: true,
            directorate: true,
            group: true,
            employmentType: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // OPTIONAL: Check if analysis already exists to prevent redundant cost
    if (application.fitScore && application.aiInsight) {
      this.logger.log(`Analysis already exists for application ${applicationId}. Skipping n8n trigger.`);
      return {
        applicant_id: applicationId,
        fit_score: application.fitScore,
        summary: application.aiInsight,
        ai_insight: application.aiInsight,
        ai_interview: application.aiInterview,
        ai_core_value: application.aiCoreValue,
        cached: true
      };
    }

    const startTime = Date.now();

    // 2. Determine Context Criteria for Job Matching
    const divisions: string[] = [];
    if (application.jobVacancy.department)
      divisions.push(application.jobVacancy.department.departmentName);
    if (application.jobVacancy.division)
      divisions.push(application.jobVacancy.division.divisionName);
    if (application.jobVacancy.group)
      divisions.push(application.jobVacancy.group.groupName);
    if (application.jobVacancy.directorate)
      divisions.push(application.jobVacancy.directorate.directorateName);

    const employmentTypeId = application.jobVacancy.employmentTypeId;

    // 3. Construct Payload
    const candidateProfile = {
      fullName:
        application.candidate.candidateFullname ||
        application.candidate.user.name,
      email:
        application.candidate.candidateEmail ||
        application.candidate.user.email,
      skills: application.candidate.skills.map((s: any) => s.candidateSkill),
      education: application.candidate.educations.map(
        (e: any) =>
          `${e.candidateMajor} at ${e.candidateSchool} (${e.candidateLastEducation?.candidateEducation})`,
      ),
      experience: application.candidate.workExperiences.map(
        (w: any) =>
          `${w.jobTitle} at ${w.companyName} (${w.employmentStartedDate} - ${w.employmentEndedDate})`,
      ),
      cvText:
        application.candidate.documents.find(
          (d: any) => d.documentType.documentType === 'CV/Resume',
        )?.extractedText || '',
    };

    const payload = {
      applicant_id: applicationId,
      candidate: candidateProfile,
      criteria: {
        divisions: [...new Set(divisions)],
        employmentTypeId: employmentTypeId,
      },
    };

    this.logger.log(`Sending payload to n8n: ${JSON.stringify(payload)}`);

    // 4. Send to n8n
    try {
      if (!this.n8nWebhookUrl) {
        throw new Error('N8N_WEBHOOK_URL is not defined');
      }

      const response = await axios.post(this.n8nWebhookUrl, payload);
      this.logger.log(`n8n Response: ${JSON.stringify(response.data)}`);

      const data = response.data;
      // Handle if n8n returns wrapped object { results: [...] } or direct array
      const analysisResults = (data.results && Array.isArray(data.results)) ? data.results : data;

      let fitScore = 0;
      let aiInsight = '';
      let aiInterview = '';
      let aiCoreValue = '';
      let aiMatchStatus: string | null = null;

      if (Array.isArray(analysisResults)) {
        const match = analysisResults.find(
          (r: any) => r.job_id === application.jobVacancyId,
        );
        if (match) {
          fitScore = match.fit_score;
          aiInsight = match.ai_insight || match.summary;
          aiInterview = match.ai_interview || (match.interview_questions ? match.interview_questions.join('\n') : '');
          aiCoreValue = match.ai_core_value || '';
          aiMatchStatus = match.aiMatchStatus || match.ai_match_status || match.match_status || match.status;
        } else if (analysisResults.length > 0) {
          this.logger.warn(`No specific match for job ${application.jobVacancyId}. Using first result.`);
          const first = analysisResults[0];
          fitScore = first.fit_score;
          aiInsight = first.ai_insight || first.summary;
          aiInterview = first.ai_interview || (first.interview_questions ? first.interview_questions.join('\n') : '');
          aiCoreValue = first.ai_core_value || '';
          aiMatchStatus = first.aiMatchStatus || first.ai_match_status || first.match_status || first.status;
        }
      } else if (typeof analysisResults === 'object') {
        fitScore = analysisResults.fit_score;
        aiInsight = analysisResults.ai_insight || analysisResults.summary;
        aiInterview = analysisResults.ai_interview || (analysisResults.interview_questions?.join('\n'));
        aiCoreValue = analysisResults.ai_core_value || '';
        aiMatchStatus = analysisResults.aiMatchStatus || analysisResults.ai_match_status || analysisResults.match_status || analysisResults.status;
      }

      this.logger.log(`Raw AI Match Status from N8N: ${aiMatchStatus}`);

      // Map common status strings to Enum
      if (typeof aiMatchStatus === 'string') {
        const statusUpper = aiMatchStatus.toUpperCase();
        if (statusUpper === 'PASS' || statusUpper === 'STRONG MATCH' || statusUpper === 'STRONG_MATCH') aiMatchStatus = 'STRONG_MATCH';
        else if (statusUpper === 'PARTIALLY PASS' || statusUpper === 'PARTIALLY_PASS' || statusUpper === 'MATCH') aiMatchStatus = 'MATCH';
        else if (statusUpper === 'FAIL' || statusUpper === 'NOT PASS' || statusUpper === 'NOT_PASS' || statusUpper === 'NOT MATCH' || statusUpper === 'NOT_MATCH') aiMatchStatus = 'NOT_MATCH';
        else aiMatchStatus = 'NOT_MATCH'; // Unrecognized string default
      } else {
        // Default fallback if unknown type
        aiMatchStatus = 'NOT_MATCH';
      }

      // Ensure it matches Enum or is null
      if (aiMatchStatus !== 'STRONG_MATCH' && aiMatchStatus !== 'MATCH' && aiMatchStatus !== 'NOT_MATCH') {
        this.logger.warn(`Invalid AI Match Status: ${aiMatchStatus}, defaulting to NOT_MATCH`);
        aiMatchStatus = 'NOT_MATCH';
      }

      await this.prisma.candidateApplication.update({
        where: { id: applicationId },
        data: {
          fitScore: fitScore,
          aiInsight: aiInsight,
          aiInterview: aiInterview,
          aiCoreValue: aiCoreValue,
          aiMatchStatus: aiMatchStatus,
        } as any, // Cast to any to bypass type issue with generated types
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.log(`AI Analysis completed in ${duration}ms`);

      return { ...analysisResults, processing_time_ms: duration };
    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.error(`Error triggering n8n (Duration: ${duration}ms): ${error.message}`);
      throw error;
    }
  }
}
