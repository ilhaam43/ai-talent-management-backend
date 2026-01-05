import { ApiProperty } from "@nestjs/swagger";
import { FamilyStatus } from "@prisma/client";

export class SimpleRelationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  name?: string;
}

export class CandidateLastEducationDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    candidateEducation!: string;
}

export class ReligionDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    religion!: string;
}

export class MaritalStatusDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    maritalStatus!: string;
}

export class NationalityDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    nationality!: string;
}

export class LanguageProficiencyDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    languageProficiency!: string;
}

export class GenderDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    gender!: string;
}

export class DocumentTypeDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    documentType!: string;
}

export class CandidateDocumentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  candidateId!: string;

  @ApiProperty()
  documentTypeId!: string;

  @ApiProperty()
  filePath!: string;

  @ApiProperty({ required: false })
  extractedText?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: () => DocumentTypeDto })
  documentType!: DocumentTypeDto;
}

export class CandidateWorkExperienceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty({ required: false })
  jobType?: string;

  @ApiProperty()
  fieldOfWork!: string;

  @ApiProperty()
  industry!: string;

  @ApiProperty()
  employmentStartedDate!: Date;

  @ApiProperty({ required: false })
  employmentEndedDate?: Date;

  @ApiProperty({ required: false })
  workExperienceDescription?: string;

  @ApiProperty()
  country!: string;

  @ApiProperty({ required: false })
  reasonForResignation?: string;

  @ApiProperty({ required: false })
  benefit?: string;

  @ApiProperty()
  referenceName!: string;

  @ApiProperty()
  referencePhoneNumber!: string;

  @ApiProperty()
  referenceRelationship!: string;
}

export class CandidateOrganizationExperienceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  organizationExperienceStartedDate!: Date;

  @ApiProperty({ required: false })
  organizationExperienceEndedDate?: Date;

  @ApiProperty({ required: false })
  organizationExperienceDescription?: string;

  @ApiProperty({ required: false })
  location?: string;
}

export class CandidateEducationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  candidateSchool!: string;

  @ApiProperty({ required: false })
  candidateMajor?: string;

  @ApiProperty({ required: false })
  candidateGpa?: number;

  @ApiProperty({ required: false })
  candidateMaxGpa?: number;

  @ApiProperty({ required: false })
  candidateCountry?: string;

  @ApiProperty({ required: false })
  candidateStartedYearStudy?: Date;

  @ApiProperty({ required: false })
  candidateEndedYearStudy?: Date;
}

export class CandidateFamilyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: FamilyStatus })
  familyStatus!: FamilyStatus;

  @ApiProperty()
  familyName!: string;

  @ApiProperty({ required: false })
  familyJob?: string;
}

export class CandidateFamilyLintasartaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: FamilyStatus })
  familyStatus!: FamilyStatus;

  @ApiProperty()
  familyName!: string;

  @ApiProperty({ required: false })
  familyPosition?: string;
}

export class CandidateSocialMediaDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  socialMediaId!: string;

  @ApiProperty()
  candidateSocialMediaUrl!: string;
}

export class CandidateSkillDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  candidateSkill!: string;

  @ApiProperty()
  candidateRating!: string;
}

export class CandidateCertificationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  certificationTitle!: string;

  @ApiProperty()
  institutionName!: string;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty({ required: false })
  certificationStartDate?: Date;

  @ApiProperty({ required: false })
  certificationEndedDate?: Date;

  @ApiProperty({ required: false })
  certificationDescription?: string;

  @ApiProperty({ required: false })
  filePath?: string;
}

export class CandidateSalaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  currentSalary?: number;

  @ApiProperty({ required: false })
  expectationSalary?: number;
}

export class CandidateMatchSkillDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    candidateMatchSkill!: string;
}

export class CandidateApplicationDto {
    @ApiProperty()
    id!: string;
    
    @ApiProperty()
    jobVacancyId!: string;

    @ApiProperty()
    candidateId!: string;
    
    @ApiProperty({ required: false })
    fitScore?: number;

    @ApiProperty({ required: false })
    aiInsight?: string;
    
    @ApiProperty({ type: () => [CandidateMatchSkillDto] })
    candidateMatchSkills!: CandidateMatchSkillDto[];
}


export class CandidateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ required: false })
  candidateFullname?: string;
  
  @ApiProperty({ required: false })
  candidateEmail?: string;

  @ApiProperty({ required: false })
  candidateNickname?: string;

  @ApiProperty({ required: false })
  cityDomicile?: string;

  @ApiProperty({ required: false })
  dateOfBirth?: Date;

  @ApiProperty({ required: false })
  placeOfBirth?: string;

  @ApiProperty({ required: false })
  idCardNumber?: string;

  @ApiProperty({ required: false })
  phoneNumber?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  // Relations

  @ApiProperty({ required: false, type: () => CandidateLastEducationDto })
  candidateLastEducation?: CandidateLastEducationDto;

  @ApiProperty({ required: false, type: () => ReligionDto })
  religion?: ReligionDto;

  @ApiProperty({ required: false, type: () => MaritalStatusDto })
  maritalStatus?: MaritalStatusDto;

  @ApiProperty({ required: false, type: () => NationalityDto })
  nationality?: NationalityDto;

  @ApiProperty({ required: false, type: () => LanguageProficiencyDto })
  languageProficiency?: LanguageProficiencyDto;

  @ApiProperty({ required: false, type: () => GenderDto })
  gender?: GenderDto;

  @ApiProperty({ type: () => [CandidateDocumentDto], required: false })
  documents?: CandidateDocumentDto[];

  @ApiProperty({ type: () => [CandidateWorkExperienceDto], required: false })
  workExperiences?: CandidateWorkExperienceDto[];

  @ApiProperty({ type: () => [CandidateOrganizationExperienceDto], required: false })
  organizationExperiences?: CandidateOrganizationExperienceDto[];

  @ApiProperty({ type: () => [CandidateEducationDto], required: false })
  educations?: CandidateEducationDto[];

  @ApiProperty({ type: () => [CandidateFamilyDto], required: false })
  families?: CandidateFamilyDto[];

  @ApiProperty({ type: () => [CandidateFamilyLintasartaDto], required: false })
  familiesLintasarta?: CandidateFamilyLintasartaDto[];

  @ApiProperty({ type: () => [CandidateSocialMediaDto], required: false })
  socialMedia?: CandidateSocialMediaDto[];

  @ApiProperty({ type: () => [CandidateSkillDto], required: false })
  skills?: CandidateSkillDto[];

  @ApiProperty({ type: () => [CandidateCertificationDto], required: false })
  certifications?: CandidateCertificationDto[];

  @ApiProperty({ type: () => [CandidateSalaryDto], required: false })
  salaries?: CandidateSalaryDto[];

  @ApiProperty({ type: () => [CandidateApplicationDto], required: false })
  applications?: CandidateApplicationDto[];
}
