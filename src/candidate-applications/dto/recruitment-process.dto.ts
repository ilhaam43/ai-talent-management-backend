import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineStageDto } from './application-response.dto';

export class RecruitmentProcessDto {
  @ApiProperty()
  candidateId!: string;

  @ApiProperty()
  candidateName!: string;

  @ApiProperty()
  candidateEmail!: string;

  @ApiProperty()
  jobVacancyId!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty()
  fitScore!: number;

  @ApiProperty()
  aiMatchStatus!: string;

  @ApiProperty()
  submissionDate!: Date;

  @ApiProperty({ type: [PipelineStageDto], description: 'All stages in the recruitment process' })
  stages!: PipelineStageDto[];
}
