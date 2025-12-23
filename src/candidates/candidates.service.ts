import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class CandidatesService {
  constructor(private prisma: PrismaService) {}

  async findOne(emailOrId: string) {
    // Try to find by User email first (since User.email is unique)
    const user = await this.prisma.user.findUnique({
      where: { email: emailOrId },
      include: { candidates: true },
    });

    if (user && user.candidates?.[0]) {
      return user.candidates[0];
    }

    // Fallback: try to find by candidateEmail or ID
    return this.prisma.candidate.findFirst({
      where: {
        OR: [
          { candidateEmail: emailOrId },
          { id: emailOrId },
        ],
      },
      include: { user: true },
    });
  }

  async create(data: { email: string; password: string; name: string; candidateFullname?: string; candidateEmail?: string }) {
    // Create User first (required for Candidate)
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    // Then create Candidate linked to User
    return this.prisma.candidate.create({
      data: {
        userId: user.id,
        candidateFullname: data.candidateFullname || data.name,
        candidateEmail: data.candidateEmail || data.email,
      },
    });
  }
}
