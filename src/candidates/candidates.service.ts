import { Injectable } from "@nestjs/common";
import { CandidatesRepository } from "./candidates.repository";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { UpdateCandidateSettingsDto } from "./dto/update-candidate-settings.dto";

@Injectable()
export class CandidatesService {
  constructor(private candidatesRepository: CandidatesRepository) { }

  async findOne(email: string) {
    // Email is not unique in Candidate model, use findFirst
    return this.candidatesRepository.findByEmail(email);
  }

  async create(userId: string) {
    // Hash password if provided
    return this.candidatesRepository.create(userId);
  }

  async getById(id: string) {
    return this.candidatesRepository.findDetailById(id);
  }

  async getAiInsights(id: string) {
    const candidate = await this.candidatesRepository.findDetailById(id);
    
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Map applications to simplified AI insight format
    return candidate.applications.map((app: any) => {
      // Get job skills and candidate skills for strength calculation
      const jobSkills = app.jobVacancy?.jobSkills?.map((js: any) => js.jobSkill) || [];
      const candidateSkills = candidate.skills?.map((cs: any) => cs.candidateSkill) || [];
      
      // Simple implementation: check if job skill is in candidate skills
      const strengths = jobSkills.filter((jobSkill) => candidateSkills.includes(jobSkill));

      // Personalize the AI Insight text
      let personalizedInsight = app.aiInsight || '';
      
      const candidateName = candidate.candidateFullname || candidate.candidateNickname || 'Candidate';
      
      // 1. Case-insensitive replacement of full name with "you"
      if (candidate.candidateFullname) {
          const nameRegex = new RegExp(candidate.candidateFullname, 'gi');
          personalizedInsight = personalizedInsight.replace(nameRegex, 'you');
      }

      // 2. Prepend greeting
      const greeting = `Hi ${candidateName}, based on your uploaded cv, here's our analysis:\n\n`;
      
      // If the insight doesn't already start with the greeting, add it
      if (!personalizedInsight.startsWith('Hi ')) {
          personalizedInsight = greeting + personalizedInsight;
      }

      return {
        jobVacancyId: app.jobVacancyId,
        fitScore: app.fitScore,
        aiInsight: personalizedInsight,
        status: app.aiMatchStatus || 'NOT MATCH',
      };
    });
  }


  async findAll() {
    return this.candidatesRepository.findAll();
  }

  async update(id: string, data: UpdateCandidateDto) {
    return this.candidatesRepository.update(id, data);
  }

  async getSettings(id: string) {
    return this.candidatesRepository.getSettings(id);
  }

  async updateSettings(id: string, data: UpdateCandidateSettingsDto) {
    let hashedPassword;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }
    return this.candidatesRepository.updateSettings(id, data, hashedPassword);
  }
}
