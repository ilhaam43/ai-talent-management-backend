import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  providers: [CandidatesService, PrismaService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
