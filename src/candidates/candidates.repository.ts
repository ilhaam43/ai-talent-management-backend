import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Prisma } from "@prisma/client";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

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

  async update(idOrUserId: string, data: UpdateCandidateDto) {
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

    const {
      candidateAddress,
      candidateCurrentAddress,
      workExperiences,
      educations,
      skills,
      organizationExperiences,
      families,
      socialMedia,
      certifications,
      ...candidateData
    } = data;

    const updateData: Prisma.CandidateUpdateInput = {
      ...candidateData,
    };

    if (candidateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(candidateData.dateOfBirth);
    }

    // Handle Address - new schema uses ID-based relations, not nested upsert
    // Address storage should be done separately via CandidateProfileService.storeAddress
    if (candidateAddress) {
      console.log('Note: candidateAddress should be stored via CandidateProfileService');
    }

    // Handle Current Address - same as above
    if (candidateCurrentAddress) {
      console.log('Note: candidateCurrentAddress should be stored via CandidateProfileService');
    }

    // Handle Work Experiences (Replace All)
    if (workExperiences) {
      updateData.workExperiences = {
        deleteMany: {},
        create: workExperiences.map((item) => ({
          ...item,
          employmentStartedDate: new Date(item.employmentStartedDate),
          employmentEndedDate: item.employmentEndedDate
            ? new Date(item.employmentEndedDate)
            : null,
        })),
      };
    }

    // Handle Educations (Replace All)
    if (educations) {
      updateData.educations = {
        deleteMany: {},
        create: educations.map((item) => ({
          ...item,
          candidateStartedYearStudy: item.candidateStartedYearStudy
            ? new Date(item.candidateStartedYearStudy)
            : null,
          candidateEndedYearStudy: item.candidateEndedYearStudy
            ? new Date(item.candidateEndedYearStudy)
            : null,
        })),
      };
    }

    // Handle Skills (Replace All)
    if (skills) {
      updateData.skills = {
        deleteMany: {},
        create: skills.map((item) => ({ ...item })),
      };
    }

    // Handle Organization Experiences (Replace All)
    if (organizationExperiences) {
      updateData.organizationExperiences = {
        deleteMany: {},
        create: organizationExperiences.map((item) => ({
          ...item,
          organizationExperienceStartedDate: new Date(
            item.organizationExperienceStartedDate
          ),
          organizationExperienceEndedDate: item.organizationExperienceEndedDate
            ? new Date(item.organizationExperienceEndedDate)
            : null,
        })),
      };
    }

    // Handle Families (Replace All)
    if (families) {
      updateData.families = {
        deleteMany: {},
        create: families.map((item) => ({ ...item })),
      };
    }

    // Handle Social Media (Replace All)
    if (socialMedia) {
      updateData.socialMedia = {
        deleteMany: {},
        create: socialMedia.map((item) => ({ ...item })),
      };
    }

    // Handle Certifications (Replace All)
    if (certifications) {
      updateData.certifications = {
        deleteMany: {},
        create: certifications.map((item) => ({
          ...item,
          certificationStartDate: item.certificationStartDate
            ? new Date(item.certificationStartDate)
            : null,
          certificationEndedDate: item.certificationEndedDate
            ? new Date(item.certificationEndedDate)
            : null,
        })),
      };
    }

    return this.prisma.candidate.update({
      where: { id: candidate.id },
      data: updateData,
    });
  }
}
