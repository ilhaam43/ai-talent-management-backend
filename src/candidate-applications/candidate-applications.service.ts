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
      let aiCoreValue = ''; // Add this

      if (Array.isArray(analysisResults)) {
        const match = analysisResults.find(
          (r: any) => r.job_id === application.jobVacancyId,
        );
        if (match) {
          fitScore = match.fit_score;
          aiInsight = match.ai_insight || match.summary; // Use ai_insight if available
          aiInterview = match.ai_interview || (match.interview_questions ? match.interview_questions.join('\n') : '');
          aiCoreValue = match.ai_core_value || '';
        } else if (analysisResults.length > 0) {
           this.logger.warn(`No specific match for job ${application.jobVacancyId}. Using first result.`);
           const first = analysisResults[0];
           fitScore = first.fit_score;
           aiInsight = first.ai_insight || first.summary;
           aiInterview = first.ai_interview || (first.interview_questions ? first.interview_questions.join('\n') : '');
           aiCoreValue = first.ai_core_value || '';
        }
      } else if (typeof analysisResults === 'object') {
        fitScore = analysisResults.fit_score;
        aiInsight = analysisResults.ai_insight || analysisResults.summary;
        aiInterview = analysisResults.ai_interview || (analysisResults.interview_questions?.join('\n'));
        aiCoreValue = analysisResults.ai_core_value || '';
      }

      await this.prisma.candidateApplication.update({
        where: { id: applicationId },
        data: {
          fitScore: fitScore,
          aiInsight: aiInsight,
          aiInterview: aiInterview,
          aiCoreValue: aiCoreValue, // Save core values
        },
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
