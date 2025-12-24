import { Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDecimal,
} from "class-validator";
import { FamilyStatus } from "@prisma/client";

// DTOs match Prisma schema exactly after lead's schema update

export class CandidateAddressDto {
  @IsString()
  @IsOptional()
  provinceId?: string;

  @IsString()
  @IsOptional()
  candidateAddress?: string;

  @IsString()
  @IsOptional()
  cityId?: string;

  @IsString()
  @IsOptional()
  subdistrictId?: string;

  @IsString()
  @IsOptional()
  postalCodeId?: string;
}

// Matches CandidateWorkExperience model in schema (all String types)
export class CandidateWorkExperienceDto {
  @IsString()
  companyName!: string;

  @IsString()
  jobTitle!: string;

  @IsString()
  jobType!: string; // Schema uses plain String, not enum

  @IsString()
  fieldOfWork!: string; // Schema uses plain String, not enum

  @IsString()
  industry!: string; // Schema uses plain String, not enum

  @IsDateString()
  employmentStartedDate!: string;

  @IsDateString()
  @IsOptional()
  employmentEndedDate?: string;

  @IsString()
  @IsOptional()
  workExperienceDescription?: string;

  @IsString()
  country!: string; // Schema uses plain String, not enum

  @IsString()
  @IsOptional()
  reasonForResignation?: string;

  @IsString()
  @IsOptional()
  benefit?: string;

  @IsString()
  referenceName!: string; // Required in schema

  @IsString()
  referencePhoneNumber!: string; // Required in schema

  @IsString()
  referenceRelationship!: string; // Required in schema
}

// Matches CandidateEducation model in schema
export class CandidateEducationDto {
  @IsString()
  candidateLastEducationId!: string; // Required in schema

  @IsString()
  candidateSchool!: string;

  @IsString()
  @IsOptional()
  candidateMajor?: string;

  @IsOptional()
  candidateGpa?: number | string; // Decimal in schema

  @IsOptional()
  candidateMaxGpa?: number | string; // Decimal in schema

  @IsString()
  @IsOptional()
  candidateCountry?: string;

  @IsDateString()
  @IsOptional()
  candidateStartedYearStudy?: string;

  @IsDateString()
  @IsOptional()
  candidateEndedYearStudy?: string;
}

// Matches CandidateSkill model in schema
export class CandidateSkillDto {
  @IsString()
  candidateSkill!: string; // Field name in schema is candidateSkill (singular)

  @IsString()
  candidateRating!: string; // Schema uses plain String, not enum
}

// Matches CandidateOrganizationExperience model in schema
export class CandidateOrganizationExperienceDto {
  @IsString()
  organizationName!: string;

  @IsString()
  role!: string;

  @IsDateString()
  organizationExperienceStartedDate!: string;

  @IsDateString()
  @IsOptional()
  organizationExperienceEndedDate?: string;

  @IsString()
  @IsOptional()
  organizationExperienceDescription?: string;

  @IsString()
  @IsOptional()
  location?: string;
}

// Matches CandidateFamily model in schema (FamilyStatus is still an enum)
export class CandidateFamilyDto {
  @IsEnum(FamilyStatus)
  familyStatus!: FamilyStatus;

  @IsString()
  familyName!: string;

  @IsString()
  @IsOptional()
  familyJob?: string;
}

// Matches CandidateSocialMedia model in schema
export class CandidateSocialMediaDto {
  @IsString()
  socialMediaId!: string; // Field name in schema

  @IsString()
  candidateSocialMediaUrl!: string;
}

// Matches CandidateCertification model in schema
export class CandidateCertificationDto {
  @IsString()
  certificationTitle!: string;

  @IsString()
  institutionName!: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsOptional()
  certificationStartDate?: string;

  @IsDateString()
  @IsOptional()
  certificationEndedDate?: string;

  @IsString()
  @IsOptional()
  certificationDescription?: string;
}

export class UpdateCandidateDto {
  @IsString()
  @IsOptional()
  candidateFullname?: string;

  @IsString()
  @IsOptional()
  candidateNickname?: string;

  @IsString()
  @IsOptional()
  candidateEmail?: string;

  @IsString()
  @IsOptional()
  cityDomicile?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @IsString()
  @IsOptional()
  idCardNumber?: string;

  @IsString()
  @IsOptional()
  religionId?: string;

  @IsString()
  @IsOptional()
  nationalityId?: string;

  @IsString()
  @IsOptional()
  languageProficienyId?: string;

  @IsString()
  @IsOptional()
  candidateEducationId?: string;

  @ValidateNested()
  @Type(() => CandidateAddressDto)
  @IsOptional()
  candidateAddress?: CandidateAddressDto;

  @ValidateNested()
  @Type(() => CandidateAddressDto)
  @IsOptional()
  candidateCurrentAddress?: CandidateAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateWorkExperienceDto)
  @IsOptional()
  workExperiences?: CandidateWorkExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateEducationDto)
  @IsOptional()
  educations?: CandidateEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSkillDto)
  @IsOptional()
  skills?: CandidateSkillDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateOrganizationExperienceDto)
  @IsOptional()
  organizationExperiences?: CandidateOrganizationExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateFamilyDto)
  @IsOptional()
  families?: CandidateFamilyDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSocialMediaDto)
  @IsOptional()
  socialMedia?: CandidateSocialMediaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateCertificationDto)
  @IsOptional()
  certifications?: CandidateCertificationDto[];
}
