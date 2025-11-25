import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string) {
    return this.prisma.candidate.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.CandidateCreateInput) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);
    return this.prisma.candidate.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }
}
