import { ApiProperty } from '@nestjs/swagger';

export class CandidateAiInsightResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  jobVacancyId: string;

  @ApiProperty({ example: 85 })
  fitScore: number;

  @ApiProperty({ example: 'Hi John Doe, based on your uploaded cv, here\'s our analysis:\n\nyou are a strong candidate...' })
  aiInsight: string;

  @ApiProperty({ example: 'MATCH', enum: ['STRONG_MATCH', 'MATCH', 'NOT_MATCH'] })
  status: string;
}
