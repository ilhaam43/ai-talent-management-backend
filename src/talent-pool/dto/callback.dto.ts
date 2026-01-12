import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// Use string enum for DTO validation (matches Prisma AiMatchStatus)
export enum AiMatchStatusValue {
  STRONG_MATCH = 'STRONG_MATCH',
  MATCH = 'MATCH',
  NOT_MATCH = 'NOT_MATCH',
}

class EducationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gpa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endYear?: string;
}

class WorkExperienceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

class CertificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;
}

class OrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}

class JobScreeningResultDto {
  @ApiProperty()
  @IsUUID()
  jobVacancyId!: string;

  @ApiProperty()
  @IsNumber()
  fitScore!: number;

  @ApiProperty({ enum: AiMatchStatusValue })
  @IsEnum(AiMatchStatusValue)
  aiMatchStatus!: AiMatchStatusValue;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiInsight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiInterview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiCoreValue?: string;
}

class CandidateResultDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [WorkExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperience?: WorkExperienceDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [CertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({ type: [OrganizationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationDto)
  organizationExperience?: OrganizationDto[];

  @ApiProperty()
  @IsString()
  cvFileUrl!: string;

  @ApiProperty()
  @IsString()
  cvFileName!: string;

  @ApiProperty({ type: [JobScreeningResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobScreeningResultDto)
  screenings!: JobScreeningResultDto[];
}

export class N8nCallbackDto {
  @ApiProperty({ description: 'Batch ID from the upload' })
  @IsUUID()
  batchId!: string;

  @ApiProperty({ description: 'Queue item ID being processed' })
  @IsUUID()
  queueItemId!: string;

  @ApiProperty({ description: 'Whether processing was successful' })
  @IsBoolean()
  success!: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ type: CandidateResultDto, description: 'Candidate data if successful' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CandidateResultDto)
  candidateData?: CandidateResultDto;
}
