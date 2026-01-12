import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Prisma, JobType, CandidateRating } from "@prisma/client";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";
import { UpdateCandidateSettingsDto } from "./dto/update-candidate-settings.dto";

@Injectable()
export class CandidatesRepository {
  constructor(private prisma: PrismaService) { }

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

  async findDetailById(id: string) {
    return this.prisma.candidate.findUnique({
      where: { id },
      include: {
        user: true,
        candidateLastEducation: true,
        religion: true,
        maritalStatus: true,
        nationality: true,
        languageProficiency: true,
        gender: true,
        documents: {
          include: {
            documentType: true,
          },
        },
        workExperiences: true,
        organizationExperiences: true,
        educations: {
          include: {
            candidateLastEducation: true,
          },
        },
        families: true,
        familiesLintasarta: true,
        socialMedia: {
          include: {
            socialMedia: true,
          },
        },
        skills: true,
        certifications: true,
        salaries: true,
        applications: {
          include: {
            jobVacancy: {
              include: {
                jobRole: true,
              },
            },
            candidateMatchSkills: true,
          },
        },
        matchSkills: true,
      },
    });
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
          jobType: item.jobType as JobType,
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
        create: skills.map((item) => ({
          candidateSkill: item.candidateSkill,
          candidateRating: item.candidateRating as CandidateRating
        })),
      };
    }

    // Handle Organization Experiences (Replace All)
    if (organizationExperiences) {
      updateData.organizationExperiences = {
        deleteMany: {},
        create: organizationExperiences.map((item) => ({
          organizationName: item.organizationName,
          role: item.role,
          organizationExperienceStartedDate: new Date(
            item.organizationExperienceStartedDate
          ),
          organizationExperienceEndedDate: item.organizationExperienceEndedDate
            ? new Date(item.organizationExperienceEndedDate)
            : null,
          organizationExperienceDescription: item.organizationExperienceDescription,
          location: item.location
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

    try {
      return await this.prisma.candidate.update({
        where: { id: candidate.id },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
  }

  async getSettings(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!candidate) return null;

    return {
      email: candidate.user.email,
      fullname: candidate.user.name,
    };
  }

  async updateSettings(id: string, data: UpdateCandidateSettingsDto, hashedPassword?: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Update User
      const userUpdateData: Prisma.UserUpdateInput = {};
      if (data.email) userUpdateData.email = data.email;
      if (data.fullname) userUpdateData.name = data.fullname;
      if (hashedPassword) userUpdateData.password = hashedPassword;

      if (Object.keys(userUpdateData).length > 0) {
        await prisma.user.update({
          where: { id: candidate.userId },
          data: userUpdateData,
        });
      }

      // 2. Update Candidate (only sync fields that exist in Candidate)
      const candidateUpdateData: Prisma.CandidateUpdateInput = {};
      if (data.email) candidateUpdateData.candidateEmail = data.email;
      if (data.fullname) candidateUpdateData.candidateFullname = data.fullname;

      if (Object.keys(candidateUpdateData).length > 0) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: candidateUpdateData,
        });
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id: candidate.userId },
      });

      return {
        email: updatedUser?.email,
        fullname: updatedUser?.name,
      };
    });
  }
}
