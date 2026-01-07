import { ApiProperty } from '@nestjs/swagger';

export class CandidateAiInsightResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  jobVacancyId!: string;

  @ApiProperty({ 
    example: 'Hi John Doe, based on your uploaded cv, here\'s our analysis:\n\nyou are a strong candidate...',
    description: 'Personalized AI insight for the candidate'
  })
  aiInsight!: string;

  @ApiProperty({ 
    example: 'Python, PyTorch, AWS',
    description: 'Comma-separated list of skills that match between candidate and job vacancy'
  })
  matchSkill!: string;

  @ApiProperty({ 
    example: 'MATCH', 
    enum: ['STRONG_MATCH', 'MATCH', 'NOT_MATCH'],
    description: 'AI match status'
  })
  status!: string;
}
