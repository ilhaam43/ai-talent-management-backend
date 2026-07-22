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
    const candidate = await this.prisma.candidate.findUnique({
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

    if (candidate && candidate.cvFileUrl) {
      try {
        const cvDocType = await this.prisma.documentType.findFirst({
          where: {
            documentType: {
              contains: 'cv',
              mode: 'insensitive',
            },
          },
        });
        if (cvDocType) {
          const cvDocs = await this.prisma.candidateDocument.findMany({
            where: {
              candidateId: candidate.id,
              documentTypeId: cvDocType.id,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });

          if (cvDocs.length === 0) {
            const newDoc = await this.prisma.candidateDocument.create({
              data: {
                candidateId: candidate.id,
                documentTypeId: cvDocType.id,
                filePath: candidate.cvStorageType === 'MINIO' ? `./uploads/documents/cv/${candidate.cvFileName || 'cv.pdf'}` : `.${candidate.cvFileUrl}`,
                objectKey: candidate.cvStorageType === 'MINIO' ? candidate.cvFileUrl : null,
                bucket: process.env.MINIO_BUCKET_NAME || 'ai-talent-documents',
                storageType: candidate.cvStorageType || 'LOCAL',
                mimeType: 'application/pdf',
                sizeBytes: 0,
                originalName: candidate.cvFileName || 'cv.pdf',
                uploadStatus: 'CONFIRMED',
              },
              include: {
                documentType: true,
              },
            });
            if (!(candidate as any).documents) (candidate as any).documents = [];
            (candidate as any).documents.push(newDoc);
          } else {
            if (cvDocs.length > 1) {
              const idsToDelete = cvDocs.slice(1).map(d => d.id);
              await this.prisma.candidateDocument.deleteMany({
                where: {
                  id: { in: idsToDelete },
                },
              });
            }
            const firstCv = cvDocs[0];
            (firstCv as any).documentType = cvDocType;
            const otherDocs = (candidate as any).documents?.filter(
              (d: any) => d.documentTypeId !== cvDocType.id
            ) || [];
            (candidate as any).documents = [...otherDocs, firstCv];
          }
        }
      } catch (err) {
        console.error('Failed to manage CV document in repository:', err);
      }
    }

    return candidate;
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
