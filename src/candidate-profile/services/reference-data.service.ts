import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ReferenceDataService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find or create Religion
   */
  async findOrCreateReligion(name?: string | null): Promise<string | null> {
    if (!name) return null;

    const normalized = name.trim();
    if (!normalized) return null;

    const religion = await this.prisma.religion.findFirst({
      where: { religion: { equals: normalized, mode: "insensitive" } },
    });

    if (religion) {
      return religion.id;
    }

    // Create if not found
    const newReligion = await this.prisma.religion.create({
      data: { religion: normalized },
    });

    return newReligion.id;
  }

  /**
   * Find or create Nationality
   */
  async findOrCreateNationality(name?: string | null): Promise<string | null> {
    if (!name) return null;

    const normalized = name.trim();
    if (!normalized) return null;

    const nationality = await this.prisma.nationality.findFirst({
      where: { nationality: { equals: normalized, mode: "insensitive" } },
    });

    if (nationality) {
      return nationality.id;
    }

    // Create if not found
    const newNationality = await this.prisma.nationality.create({
      data: { nationality: normalized },
    });

    return newNationality.id;
  }

  /**
   * Find or create Gender
   */
  async findOrCreateGender(name?: string | null): Promise<string | null> {
    if (!name) return null;

    const normalized = name.trim();
    if (!normalized) return null;

    // Map common variations
    let genderName = normalized;
    if (
      normalized.toUpperCase().includes("MALE") &&
      !normalized.toUpperCase().includes("FEMALE")
    ) {
      genderName = "Male";
    } else if (normalized.toUpperCase().includes("FEMALE")) {
      genderName = "Female";
    } else if (normalized.toUpperCase().includes("OTHER")) {
      genderName = "Other";
    }

    const gender = await this.prisma.gender.findFirst({
      where: { gender: { equals: genderName, mode: "insensitive" } },
    });

    if (gender) {
      return gender.id;
    }

    // Create if not found
    const newGender = await this.prisma.gender.create({
      data: { gender: genderName },
    });

    return newGender.id;
  }

  /**
   * Find or create Social Media Type
   */
  async findOrCreateSocialMediaType(name: string): Promise<string> {
    const normalized = name.trim();

    const socialMedia = await this.prisma.socialMedia.findFirst({
      where: { socialMedia: { equals: normalized, mode: "insensitive" } },
    });

    if (socialMedia) {
      return socialMedia.id;
    }

    // Create if not found
    const newSocialMedia = await this.prisma.socialMedia.create({
      data: { socialMedia: normalized },
    });

    return newSocialMedia.id;
  }

  /**
   * Find or create Education Level (CandidateLastEducation)
   */
  async findOrCreateEducationLevel(
    level?: string | null,
  ): Promise<string | null> {
    if (!level) return null;

    const normalized = level.trim();
    if (!normalized) return null;

    const education = await this.prisma.candidateLastEducation.findFirst({
      where: {
        candidateEducation: { equals: normalized, mode: "insensitive" },
      },
    });

    if (education) {
      return education.id;
    }

    // Create if not found
    const newEducation = await this.prisma.candidateLastEducation.create({
      data: { candidateEducation: normalized },
    });

    return newEducation.id;
  }

  /**
   * Find or create Marital Status
   */
  async findOrCreateMaritalStatus(
    name?: string | null,
  ): Promise<string | null> {
    if (!name) return null;

    const normalized = name.trim();
    if (!normalized) return null;

    // Normalize input (e.g., "SINGLE" -> "Single")
    let statusName =
      normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

    const maritalStatus = await this.prisma.maritalStatus.findFirst({
      where: { maritalStatus: { equals: normalized, mode: "insensitive" } },
    });

    if (maritalStatus) {
      return maritalStatus.id;
    }

    // Create if not found
    const newStatus = await this.prisma.maritalStatus.create({
      data: { maritalStatus: statusName },
    });

    return newStatus.id;
  }

  /**
   * Find or create Language Proficiency
   */
  async findOrCreateLanguageProficiency(
    name?: string | null,
  ): Promise<string | null> {
    if (!name) return null;

    const normalized = name.trim();
    if (!normalized) return null;

    const proficiency = await this.prisma.languageProficiency.findFirst({
      where: {
        languageProficiency: { equals: normalized, mode: "insensitive" },
      },
    });

    if (proficiency) {
      return proficiency.id;
    }

    // Create if not found
    const newProficiency = await this.prisma.languageProficiency.create({
      data: { languageProficiency: normalized },
    });

    return newProficiency.id;
  }
}
