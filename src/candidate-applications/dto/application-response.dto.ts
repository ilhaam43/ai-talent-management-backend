import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineStageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  stage!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  scheduledDate?: string;

  @ApiPropertyOptional()
  scheduledStartTime?: string;

  @ApiPropertyOptional()
  scheduledEndTime?: string;

  @ApiPropertyOptional()
  link?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  stageScore?: number;

  @ApiPropertyOptional()
  interviewer?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ApplicationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  jobVacancyId!: string;

  @ApiProperty()
  candidateId!: string;

  @ApiProperty()
  currentStage!: string;

  @ApiProperty()
  currentStatus!: string;

  @ApiPropertyOptional()
  fitScore?: number;

  @ApiPropertyOptional()
  aiMatchStatus?: string;

  @ApiPropertyOptional()
  aiInsight?: string;

  @ApiProperty()
  submissionDate!: Date;

  @ApiProperty({ type: [PipelineStageDto] })
  pipelineHistory!: PipelineStageDto[];

  @ApiProperty()
  jobVacancy!: {
    id: string;
    jobRole: string;
    employeePosition: string;
    division?: string;
    department?: string;
  };

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class DashboardSummaryDto {
  @ApiProperty({ description: 'Total number of applications' })
  totalCandidates!: number;

  @ApiProperty({ description: 'Number of STRONG_MATCH candidates' })
  passCandidates!: number;

  @ApiProperty({ description: 'Number of MATCH candidates' })
  partiallyPassCandidates!: number;

  @ApiProperty({ description: 'Number of NOT_MATCH candidates' })
  notPassCandidates!: number;
}
