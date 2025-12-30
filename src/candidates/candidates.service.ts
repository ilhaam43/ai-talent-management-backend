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
    return this.candidatesRepository.findById(id);
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
