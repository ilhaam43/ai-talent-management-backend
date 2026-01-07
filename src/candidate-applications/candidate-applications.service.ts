import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import axios from 'axios';

@Injectable()
export class CandidateApplicationsService {
  private readonly logger = new Logger(CandidateApplicationsService.name);
  private readonly n8nWebhookUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

    this.logger.log(`Sending payload to n8n: ${JSON.stringify(payload)}`);

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

  async findAll() {
    return this.prisma.candidateApplication.findMany({
      include: {
        candidate: {
          include: {
            user: { select: { name: true, email: true } },
            religion: true,
            maritalStatus: true,
            gender: true,
            nationality: true
          }
        },
        jobVacancy: {
          include: {
            jobRole: true,
            jobVacancyStatus: true,
            directorate: true,
            group: true,
            division: true,
            department: true
          }
        },
        applicationPipeline: true,
        applicationLastStatus: true,

        // Include salary if needed for display
        candidateSalary: true
      },
      orderBy: {
        submissionDate: 'desc'
      }
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
