import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string) {
    // Email is not unique in Candidate model, use findFirst
    return this.prisma.candidate.findFirst({
      where: { email },
    });
  }

  async create(data: Prisma.CandidateCreateInput) {
    // Hash password if provided
    if (data.password) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(data.password as string, salt);
      return this.prisma.candidate.create({
        data: {
          ...data,
          password: hashedPassword,
        },
      });
    }
    return this.prisma.candidate.create({
      data,
    });
  }
}
