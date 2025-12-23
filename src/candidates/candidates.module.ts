import { Module } from "@nestjs/common";
import { CandidatesService } from "./candidates.service";
import { CandidatesRepository } from "./candidates.repository";
import { PrismaService } from "../database/prisma.service";
import { CandidatesController } from "./candidates.controller";

@Module({
  providers: [CandidatesService, PrismaService, CandidatesRepository],
  controllers: [CandidatesController],
  exports: [CandidatesService],
})
export class CandidatesModule {}
