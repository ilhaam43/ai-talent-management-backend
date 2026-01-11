import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TalentPoolRepository {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Batch Operations
  // ============================================

  async createBatch(data: {
    batchName?: string;
    uploadedById: string;
    sourceType: any;
    sourceUrl?: string;
    totalFiles: number;
  }): Promise<any> {
    return this.prisma.talentPoolBatch.create({
      data: {
        batchName: data.batchName,
        uploadedById: data.uploadedById,
        sourceType: data.sourceType,
        sourceUrl: data.sourceUrl,
        totalFiles: data.totalFiles,
        status: 'PENDING',
      },
    });
  }

  async findBatchById(id: string): Promise<any | null> {
    return this.prisma.talentPoolBatch.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        _count: {
          select: {
            candidates: true,
            queueItems: true,
          },
        },
      },
    });
  }

  async findAllBatches(params: {
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<any[]> {
    return this.prisma.talentPoolBatch.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy || { createdAt: 'desc' },
      include: {
        uploadedBy: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        _count: {
          select: {
            candidates: true,
            queueItems: true,
          },
        },
      },
    });
  }

  async updateBatchStatus(
    id: string,
    status: any,
    processedFiles?: number,
    failedFiles?: number,
  ): Promise<any> {
    return this.prisma.talentPoolBatch.update({
      where: { id },
      data: {
        status,
        ...(processedFiles !== undefined && { processedFiles }),
        ...(failedFiles !== undefined && { failedFiles }),
      },
    });
  }

  async incrementBatchProgress(
    batchId: string,
    success: boolean,
  ): Promise<any> {
    return this.prisma.talentPoolBatch.update({
      where: { id: batchId },
      data: success
        ? { processedFiles: { increment: 1 } }
        : { failedFiles: { increment: 1 } },
    });
  }

  // ============================================
  // Queue Operations
  // ============================================

  async createQueueItems(
    batchId: string,
    files: { fileUrl: string; fileName: string }[],
  ): Promise<{ count: number }> {
    return this.prisma.talentPoolQueue.createMany({
      data: files.map((file) => ({
        batchId,
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        status: 'PENDING' as any,
      })),
    });
  }

  async findPendingQueueItems(
    limit: number = 10,
  ): Promise<any[]> {
    return this.prisma.talentPoolQueue.findMany({
      where: { status: 'PENDING' },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        batch: true,
      },
    });
  }

  async updateQueueItemStatus(
    id: string,
    status: any,
    errorMsg?: string,
  ): Promise<any> {
    return this.prisma.talentPoolQueue.update({
      where: { id },
      data: {
        status,
        errorMsg,
        processedAt: status !== 'PENDING' ? new Date() : null,
      },
    });
  }

  async markQueueItemsProcessing(ids: string[]): Promise<{ count: number }> {
    return this.prisma.talentPoolQueue.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PROCESSING' },
    });
  }

  // ============================================
  // Candidate Operations
  // ============================================

  async findCandidateByEmail(email: string): Promise<any | null> {
    return this.prisma.talentPoolCandidate.findFirst({
      where: { email },
      include: {
        screenings: {
          include: {
            jobVacancy: {
              include: {
                jobRole: true,
                division: true,
              },
            },
          },
        },
      },
    });
  }

  async createCandidate(data: {
    batchId: string;
    fullName: string;
    email?: string;
    phone?: string;
    city?: string;
    linkedin?: string;
    educationData?: any;
    workExperienceData?: any;
    skillsData?: any;
    certificationsData?: any;
    organizationData?: any;
    cvFileUrl: string;
    cvFileName: string;
  }): Promise<any> {
    return this.prisma.talentPoolCandidate.create({
      data: {
        batchId: data.batchId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        linkedin: data.linkedin,
        educationData: data.educationData,
        workExperienceData: data.workExperienceData,
        skillsData: data.skillsData,
        certificationsData: data.certificationsData,
        organizationData: data.organizationData,
        cvFileUrl: data.cvFileUrl,
        cvFileName: data.cvFileName,
        hrStatus: 'PENDING',
      },
    });
  }

  async findCandidateById(id: string): Promise<any | null> {
    return this.prisma.talentPoolCandidate.findUnique({
      where: { id },
      include: {
        batch: true,
        screenings: {
          include: {
            jobVacancy: {
              include: {
                jobRole: true,
                division: true,
                department: true,
              },
            },
          },
          orderBy: { fitScore: 'desc' },
        },
      },
    });
  }

  async findAllCandidates(params: {
    skip?: number;
    take?: number;
    batchId?: string;
    jobVacancyId?: string;
    hrStatus?: any;
    minScore?: number;
    search?: string;
  }): Promise<{ candidates: any[]; total: number }> {
    const where: any = {};

    if (params.batchId) {
      where.batchId = params.batchId;
    }

    if (params.hrStatus) {
      where.hrStatus = params.hrStatus;
    }

    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.jobVacancyId || params.minScore) {
      where.screenings = {
        some: {
          ...(params.jobVacancyId && { jobVacancyId: params.jobVacancyId }),
          ...(params.minScore && { fitScore: { gte: params.minScore } }),
        },
      };
    }

    const [candidates, total] = await Promise.all([
      this.prisma.talentPoolCandidate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: {
          screenings: {
            include: {
              jobVacancy: {
                include: {
                  jobRole: true,
                  division: true,
                },
              },
            },
            orderBy: { fitScore: 'desc' },
          },
        },
      }),
      this.prisma.talentPoolCandidate.count({ where }),
    ]);

    return { candidates, total };
  }

  async updateCandidateHRStatus(
    id: string,
    hrStatus: any,
    hrNotes?: string,
    processedToStep?: string,
  ): Promise<any> {
    return this.prisma.talentPoolCandidate.update({
      where: { id },
      data: {
        hrStatus,
        hrNotes,
        processedToStep,
      },
    });
  }

  async bulkUpdateCandidateStatus(
    ids: string[],
    hrStatus: any,
    processedToStep?: string,
  ): Promise<{ count: number }> {
    return this.prisma.talentPoolCandidate.updateMany({
      where: { id: { in: ids } },
      data: {
        hrStatus,
        processedToStep,
      },
    });
  }

  // ============================================
  // Screening Operations
  // ============================================

  async createScreening(data: {
    talentPoolCandidateId: string;
    jobVacancyId: string;
    fitScore: number;
    aiMatchStatus: any;
    aiInsight?: string;
    aiInterview?: string;
    aiCoreValue?: string;
  }): Promise<any> {
    return this.prisma.talentPoolScreening.create({
      data: {
        talentPoolCandidateId: data.talentPoolCandidateId,
        jobVacancyId: data.jobVacancyId,
        fitScore: data.fitScore,
        aiMatchStatus: data.aiMatchStatus,
        aiInsight: data.aiInsight,
        aiInterview: data.aiInterview,
        aiCoreValue: data.aiCoreValue,
      },
    });
  }

  async createManyScreenings(
    screenings: {
      talentPoolCandidateId: string;
      jobVacancyId: string;
      fitScore: number;
      aiMatchStatus: any;
      aiInsight?: string;
      aiInterview?: string;
      aiCoreValue?: string;
    }[],
  ): Promise<{ count: number }> {
    return this.prisma.talentPoolScreening.createMany({
      data: screenings,
      skipDuplicates: true,
    });
  }

  async findScreeningsByCandidate(
    candidateId: string,
  ): Promise<any[]> {
    return this.prisma.talentPoolScreening.findMany({
      where: { talentPoolCandidateId: candidateId },
      include: {
        jobVacancy: {
          include: {
            jobRole: true,
            division: true,
            department: true,
          },
        },
      },
      orderBy: { fitScore: 'desc' },
    });
  }

  async checkExistingScreening(
    candidateId: string,
    jobVacancyId: string,
  ): Promise<any | null> {
    return this.prisma.talentPoolScreening.findUnique({
      where: {
        talentPoolCandidateId_jobVacancyId: {
          talentPoolCandidateId: candidateId,
          jobVacancyId,
        },
      },
    });
  }

  async getScreenedJobIds(candidateId: string): Promise<string[]> {
    const screenings = await this.prisma.talentPoolScreening.findMany({
      where: { talentPoolCandidateId: candidateId },
      select: { jobVacancyId: true },
    });
    return screenings.map((s) => s.jobVacancyId);
  }
}
