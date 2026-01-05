import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
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
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  provinceId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateAddress?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cityId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subdistrictId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  postalCodeId?: string;
}

// Matches CandidateWorkExperience model in schema (all String types)
export class CandidateWorkExperienceDto {
  @ApiProperty()
  @IsString()
  companyName!: string;

  @ApiProperty()
  @IsString()
  jobTitle!: string;

  @ApiProperty()
  @IsString()
  jobType!: string;

  @ApiProperty()
  @IsString()
  fieldOfWork!: string;

  @ApiProperty()
  @IsString()
  industry!: string;

  @ApiProperty()
  @IsDateString()
  employmentStartedDate!: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  employmentEndedDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  workExperienceDescription?: string;

  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  reasonForResignation?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  benefit?: string;

  @ApiProperty()
  @IsString()
  referenceName!: string;

  @ApiProperty()
  @IsString()
  referencePhoneNumber!: string;

  @ApiProperty()
  @IsString()
  referenceRelationship!: string;
}

// Matches CandidateEducation model in schema
// Matches CandidateEducation model in schema
export class CandidateEducationDto {
  @ApiProperty()
  @IsString()
  candidateLastEducationId!: string;

  @ApiProperty()
  @IsString()
  candidateSchool!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateMajor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  candidateGpa?: number | string;

  @ApiProperty({ required: false })
  @IsOptional()
  candidateMaxGpa?: number | string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateCountry?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  candidateStartedYearStudy?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  candidateEndedYearStudy?: string;
}

// Matches CandidateSkill model in schema
export class CandidateSkillDto {
  @ApiProperty()
  @IsString()
  candidateSkill!: string;

  @ApiProperty()
  @IsString()
  candidateRating!: string;
}

// Matches CandidateOrganizationExperience model in schema
export class CandidateOrganizationExperienceDto {
  @ApiProperty()
  @IsString()
  organizationName!: string;

  @ApiProperty()
  @IsString()
  role!: string;

  @ApiProperty()
  @IsDateString()
  organizationExperienceStartedDate!: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  organizationExperienceEndedDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  organizationExperienceDescription?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;
}

// Matches CandidateFamily model in schema (FamilyStatus is still an enum)
export class CandidateFamilyDto {
  @ApiProperty({ enum: FamilyStatus })
  @IsEnum(FamilyStatus)
  familyStatus!: FamilyStatus;

  @ApiProperty()
  @IsString()
  familyName!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  familyJob?: string;
}

// Matches CandidateSocialMedia model in schema
export class CandidateSocialMediaDto {
  @ApiProperty()
  @IsString()
  socialMediaId!: string;

  @ApiProperty()
  @IsString()
  candidateSocialMediaUrl!: string;
}

// Matches CandidateCertification model in schema
export class CandidateCertificationDto {
  @ApiProperty()
  @IsString()
  certificationTitle!: string;

  @ApiProperty()
  @IsString()
  institutionName!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  certificationStartDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  certificationEndedDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  certificationDescription?: string;
}

export class UpdateCandidateDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateFullname?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateNickname?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cityDomicile?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  placeOfBirth?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  idCardNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  religionId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nationalityId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  languageProficienyId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  candidateEducationId?: string;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => CandidateAddressDto)
  @IsOptional()
  candidateAddress?: CandidateAddressDto;

  @ApiProperty({ required: false })
  @ValidateNested()
  @Type(() => CandidateAddressDto)
  @IsOptional()
  candidateCurrentAddress?: CandidateAddressDto;

  @ApiProperty({ type: [CandidateWorkExperienceDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateWorkExperienceDto)
  @IsOptional()
  workExperiences?: CandidateWorkExperienceDto[];

  @ApiProperty({ type: [CandidateEducationDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateEducationDto)
  @IsOptional()
  educations?: CandidateEducationDto[];

  @ApiProperty({ type: [CandidateSkillDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSkillDto)
  @IsOptional()
  skills?: CandidateSkillDto[];

  @ApiProperty({ type: [CandidateOrganizationExperienceDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateOrganizationExperienceDto)
  @IsOptional()
  organizationExperiences?: CandidateOrganizationExperienceDto[];

  @ApiProperty({ type: [CandidateFamilyDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateFamilyDto)
  @IsOptional()
  families?: CandidateFamilyDto[];

  @ApiProperty({ type: [CandidateSocialMediaDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateSocialMediaDto)
  @IsOptional()
  socialMedia?: CandidateSocialMediaDto[];

  @ApiProperty({ type: [CandidateCertificationDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateCertificationDto)
  @IsOptional()
  certifications?: CandidateCertificationDto[];
}
