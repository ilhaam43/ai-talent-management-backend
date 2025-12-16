import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class CandidatesRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.candidate.findFirst({
      where: { candidateEmail: email },
    });
  }

  async create(userId: string) {
    return this.prisma.candidate.create({
      data: {
        userId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.candidate.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.candidate.findMany();
  }

  async update(idOrUserId: string, data: any) {
    // Try to find candidate by ID first
    let candidate = await this.prisma.candidate.findUnique({
      where: { id: idOrUserId },
    });

    // If not found, try to find by User ID
    if (!candidate) {
      candidate = await this.prisma.candidate.findFirst({
        where: { userId: idOrUserId },
      });
    }

    if (!candidate) {
      throw new Error(`Candidate with ID or User ID ${idOrUserId} not found`);
    }
    
    return this.prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        ...data,
      },
    });
  }
}
