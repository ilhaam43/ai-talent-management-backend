import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReferenceDataService } from './services/reference-data.service';
import { AddressLookupService } from './services/address-lookup.service';
import {
  parseDate,
  mapJobType,
  mapFieldOfWork,
  mapIndustry,
  mapCountry,
  mapRelationship,
  mapCandidateRating,
  normalizeEducationLevel,
} from './utils/data-mapper.util';
import {
  PersonalInfo,
  SocialMedia,
  Address,
  Education,
  WorkExperience,
  OrganizationExperience,
  Certification,
} from '../cv-parser/dto/parsed-candidate-data.dto';

@Injectable()
export class CandidateProfileService {
  constructor(
    private prisma: PrismaService,
    private referenceData: ReferenceDataService,
    private addressLookup: AddressLookupService,
  ) {}

  /**
   * Store all parsed data at once
   */
  async storeParsedData(candidateId: string, parsedData: any) {
    console.log('storeParsedData service called with:', candidateId, parsedData);
    try {
      return await this.prisma.$transaction(async (tx) => {
      const results: any = {};

      try {
        // Store personal info
        if (parsedData.personalInfo && Object.keys(parsedData.personalInfo).length > 0) {
          try {
            console.log('Storing personal info...', JSON.stringify(parsedData.personalInfo).substring(0, 100));
            results.personalInfo = await this.storePersonalInfo(candidateId, parsedData.personalInfo, tx);
            console.log('Personal info stored:', results.personalInfo?.id || 'success');
          } catch (error: any) {
            console.error('Error storing personal info:', error.message, error.stack);
            // Continue with other data
          }
        } else {
          console.log('Skipping personal info - empty or missing');
        }

        // Store address
        if (parsedData.address && Object.keys(parsedData.address).length > 0) {
          try {
            results.address = await this.storeAddress(candidateId, parsedData.address, false, tx);
          } catch (error: any) {
            console.error('Error storing address:', error.message);
            // Continue with other data
          }
        }

        // Store education
        if (parsedData.education && Array.isArray(parsedData.education) && parsedData.education.length > 0) {
          try {
            results.education = await this.storeEducation(candidateId, parsedData.education, tx);
          } catch (error: any) {
            console.error('Error storing education:', error.message);
            // Continue with other data
          }
        }

        // Store work experience
        if (parsedData.workExperience && Array.isArray(parsedData.workExperience) && parsedData.workExperience.length > 0) {
          try {
            results.workExperience = await this.storeWorkExperience(candidateId, parsedData.workExperience, tx);
          } catch (error: any) {
            console.error('Error storing work experience:', error.message);
            // Continue with other data
          }
        }

        // Store organization experience
        if (parsedData.organizationExperience && Array.isArray(parsedData.organizationExperience) && parsedData.organizationExperience.length > 0) {
          try {
            results.organizationExperience = await this.storeOrganizationExperience(
              candidateId,
              parsedData.organizationExperience,
              tx,
            );
          } catch (error: any) {
            console.error('Error storing organization experience:', error.message);
            // Continue with other data
          }
        }

        // Store skills
        if (parsedData.skills && Array.isArray(parsedData.skills) && parsedData.skills.length > 0) {
          try {
            results.skills = await this.storeSkills(candidateId, parsedData.skills, tx);
          } catch (error: any) {
            console.error('Error storing skills:', error.message);
            // Continue with other data
          }
        }

        // Store certifications
        if (parsedData.certifications && Array.isArray(parsedData.certifications) && parsedData.certifications.length > 0) {
          try {
            results.certifications = await this.storeCertifications(candidateId, parsedData.certifications, tx);
          } catch (error: any) {
            console.error('Error storing certifications:', error.message);
            // Continue with other data
          }
        }

        // Store social media
        if (parsedData.socialMedia && Object.keys(parsedData.socialMedia).length > 0) {
          try {
            results.socialMedia = await this.storeSocialMedia(candidateId, parsedData.socialMedia, tx);
          } catch (error: any) {
            console.error('Error storing social media:', error.message);
            // Continue with other data
          }
        }
      } catch (error: any) {
        console.error('Transaction error:', error.message);
        throw error;
      }

        console.log('Transaction completed successfully');
        return results;
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Store personal information
   */
  async storePersonalInfo(
    candidateId: string,
    personalInfo: PersonalInfo,
    tx?: any,
  ): Promise<any> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Lookup reference data
    const religionId = personalInfo.religion
      ? await this.referenceData.findOrCreateReligion(personalInfo.religion)
      : null;
    const nationalityId = personalInfo.nationality
      ? await this.referenceData.findOrCreateNationality(personalInfo.nationality)
      : null;

    // Update candidate
    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        candidateFullname: personalInfo.fullName || undefined,
        candidateNickname: personalInfo.nickname || undefined,
        candidateEmail: personalInfo.email || undefined,
        dateOfBirth: parseDate(personalInfo.dateOfBirth) || undefined,
        placeOfBirth: personalInfo.placeOfBirth || undefined,
        idCardNumber: personalInfo.idCardNumber || undefined,
        religionId: religionId || undefined,
        nationalityId: nationalityId || undefined,
      },
    });

    return updated;
  }

  /**
   * Store address
   */
  async storeAddress(
    candidateId: string,
    address: Address,
    isCurrent: boolean = false,
    tx?: any,
  ): Promise<any> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    // Create address record
    // Note: address.address is from StoreAddressDto, not the base Address interface
    const addressText = (address as any).address || '';
    const addressId = await this.addressLookup.createAddressRecord(
      candidateId,
      address.province,
      address.city,
      address.subdistrict,
      address.postalCode,
      addressText,
      isCurrent,
      tx,
    );

    if (!addressId) {
      return null;
    }

    // Link to candidate
    const updateData: any = {};
    if (isCurrent) {
      updateData.candidateCurrentAddressId = addressId;
    } else {
      updateData.candidateAddressId = addressId;
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: updateData,
    });

    return { id: addressId };
  }

  /**
   * Store education history
   */
  async storeEducation(candidateId: string, education: Education[], tx?: any): Promise<any[]> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const results = [];

    for (const edu of education) {
      const normalizedLevel = normalizeEducationLevel(edu.educationLevel || edu.degree);
      // Always get an education level ID - use fallback if none found
      let educationLevelId = normalizedLevel
        ? await this.referenceData.findOrCreateEducationLevel(normalizedLevel)
        : null;
      
      // If no education level found, use a default (e.g., "Other" or first available)
      if (!educationLevelId) {
        educationLevelId = await this.referenceData.findOrCreateEducationLevel('Other');
      }
      
      // Parse dates
      const startDate = parseDate(edu.startYear);
      const endDate = parseDate(edu.endYear);

      // Build data object - candidateLastEducationId is required in schema
      // GPA fields are Decimal(3,2) - ensure proper format
      const gpaValue = edu.gpa != null ? parseFloat(String(edu.gpa)) : null;
      const gpaMaxValue = edu.gpaMax != null ? parseFloat(String(edu.gpaMax)) : null;
      
      const educationData: any = {
        candidateId,
        candidateLastEducationId: educationLevelId,
        candidateSchool: edu.university || edu.institution || '',
        candidateMajor: edu.major || null,
        candidateGpa: gpaValue,
        candidateMaxGpa: gpaMaxValue,
        candidateCountry: edu.country || null,
        candidateStartedYearStudy: startDate || null,
        candidateEndedYearStudy: endDate || null,
      };

      const created = await prisma.candidateEducation.create({
        data: educationData,
      });

      results.push(created);
    }

    return results;
  }

  /**
   * Store work experience
   */
  async storeWorkExperience(
    candidateId: string,
    workExperience: WorkExperience[],
    tx?: any,
  ): Promise<any[]> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const results = [];

    for (const work of workExperience) {
      // Parse dates - use fallback if not available
      const startDate = parseDate(work.startDate) || new Date(); // Use today as fallback
      const endDate = parseDate(work.endDate);

      // Map enums
      const jobType = mapJobType(work.jobType);
      const fieldOfWork = mapFieldOfWork(work.fieldOfWork);
      const industry = mapIndustry(work.industry);
      const country = mapCountry(work.country);
      const relationship = mapRelationship(work.referenceRelationship);

      // Skip if no company name (minimum required info)
      if (!work.company || work.company.trim().length < 2) {
        continue;
      }

      const created = await prisma.candidateWorkExperience.create({
        data: {
          candidateId,
          companyName: work.company,
          jobTitle: work.position,
          jobType,
          fieldOfWork,
          industry,
          employmentStartedDate: startDate,
          employmentEndedDate: endDate || undefined,
          workExperienceDescription: work.description || undefined,
          country,
          reasonForResignation: work.reasonForResignation || undefined,
          benefit: work.benefit || undefined,
          referenceName: work.referenceName || undefined,
          phoneNumber: work.referencePhone || undefined,
          relationship: relationship || undefined,
        },
      });

      results.push(created);
    }

    return results;
  }

  /**
   * Store organization experience
   */
  async storeOrganizationExperience(
    candidateId: string,
    orgExperience: OrganizationExperience[],
    tx?: any,
  ): Promise<any[]> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const results = [];

    for (const org of orgExperience) {
      // Parse dates
      const startDate = parseDate(org.startDate);
      const endDate = parseDate(org.endDate);

      if (!startDate) {
        // Skip if no start date (required field)
        continue;
      }

      const created = await prisma.candidateOrganizationExperience.create({
        data: {
          candidateId,
          organizationName: org.organization,
          role: org.role,
          organizationExperienceStartedDate: startDate,
          organizationExperienceEndedDate: endDate || undefined,
          organizationExperienceDescription: org.description || undefined,
          location: org.location || undefined,
        },
      });

      results.push(created);
    }

    return results;
  }

  /**
   * Store skills
   */
  async storeSkills(candidateId: string, skills: string[], tx?: any): Promise<any[]> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const results = [];

    for (const skill of skills) {
      if (!skill || !skill.trim()) continue;

      const created = await prisma.candidateSkill.create({
        data: {
          candidateId,
          candidateSkill: skill.trim(),
          candidateRating: '3', // Default rating as string (1-5 scale)
        },
      });

      results.push(created);
    }

    return results;
  }

  /**
   * Store certifications
   */
  async storeCertifications(
    candidateId: string,
    certifications: Certification[],
    tx?: any,
  ): Promise<any[]> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const results = [];

    for (const cert of certifications) {
      // Parse dates
      const startDate = parseDate(cert.startDate);
      const endDate = parseDate(cert.endDate);

      const created = await prisma.candidateCertification.create({
        data: {
          candidateId,
          certificationTitle: cert.name,
          institutionName: cert.issuer || '',
          location: cert.location || undefined,
          certificationStartDate: startDate || undefined,
          certificationEndedDate: endDate || undefined,
          certificationDescription: cert.description || undefined,
        },
      });

      results.push(created);
    }

    return results;
  }

  /**
   * Store social media
   */
  async storeSocialMedia(candidateId: string, socialMedia: SocialMedia, tx?: any): Promise<any[]> {
    const prisma = tx || this.prisma;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }

    const results = [];

    // Map social media platforms
    const platforms = [
      { key: 'linkedin', name: 'LinkedIn' },
      { key: 'instagram', name: 'Instagram' },
      { key: 'facebook', name: 'Facebook' },
      { key: 'tiktok', name: 'TikTok' },
    ];

    for (const platform of platforms) {
      const url = socialMedia[platform.key as keyof SocialMedia];
      if (url) {
        const socialMediaTypeId = await this.referenceData.findOrCreateSocialMediaType(platform.name);

        const created = await prisma.candidateSocialMedia.create({
          data: {
            candidateId,
            candidateSocialMediaId: socialMediaTypeId,
            candidateSocialMediaUrl: url,
          },
        });

        results.push(created);
      }
    }

    return results;
  }
}

