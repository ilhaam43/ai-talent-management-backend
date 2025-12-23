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
} from "class-validator";
import {
  JobType,
  FieldOfWork,
  Industry,
  Country,
  Relationship,
  FamilyStatus,
  CandidateRating,
} from "@prisma/client";

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

export class CandidateWorkExperienceDto {
  @IsString()
  @IsOptional()
  companyName!: string;

  @IsString()
  @IsOptional()
  jobTitle!: string;

  @IsEnum(JobType)
  @IsOptional()
  jobType!: JobType;

  @IsEnum(FieldOfWork)
  @IsOptional()
  fieldOfWork!: FieldOfWork;

  @IsEnum(Industry)
  @IsOptional()
  industry!: Industry;

  @IsDateString()
  @IsOptional()
  employmentStartedDate!: string;

  @IsDateString()
  @IsOptional()
  employmentEndedDate?: string;

  @IsString()
  @IsOptional()
  workExperienceDescription?: string;

  @IsEnum(Country)
  @IsOptional()
  country!: Country;

  @IsString()
  @IsOptional()
  reasonForResignation?: string;

  @IsString()
  @IsOptional()
  benefit?: string;

  @IsString()
  @IsOptional()
  referenceName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsEnum(Relationship)
  @IsOptional()
  relationship?: Relationship;
}

export class CandidateEducationDto {
  @IsString()
  @IsOptional()
  candidateLastEducationId!: string;

  @IsString()
  @IsOptional()
  candidateSchool!: string;

  @IsString()
  @IsOptional()
  candidateMajor?: string;

  @IsString()
  @IsOptional()
  candidateGpa?: string;

  @IsString()
  @IsOptional()
  candidateMaxGpa?: string;

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

export class CandidateSkillDto {
  @IsString()
  @IsOptional()
  candidateSkills!: string;

  @IsEnum(CandidateRating)
  @IsOptional()
  candidateRating!: CandidateRating;
}

export class CandidateOrganizationExperienceDto {
  @IsString()
  @IsOptional()
  organizationName!: string;

  @IsString()
  @IsOptional()
  role!: string;

  @IsDateString()
  @IsOptional()
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

export class CandidateFamilyDto {
  @IsEnum(FamilyStatus)
  @IsOptional()
  familyStatus!: FamilyStatus;

  @IsString()
  @IsOptional()
  familyName!: string;

  @IsString()
  @IsOptional()
  familyJob?: string;
}

export class CandidateSocialMediaDto {
  @IsString()
  @IsOptional()
  candidateSocialMediaId!: string;

  @IsString()
  @IsOptional()
  candidateSocialMediaUrl!: string;
}

export class CandidateCertificationDto {
  @IsString()
  @IsOptional()
  certificationTitle!: string;

  @IsString()
  @IsOptional()
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
