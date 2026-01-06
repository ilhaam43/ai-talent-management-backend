import { ApiProperty } from '@nestjs/swagger';

export class AiAnalysisResultDto {
  @ApiProperty({ description: 'Matched Job Vacancy ID', example: '1ba77961-7a1e-4dfb-a54a-4add7e7ea8f2' })
  job_id!: string;

  @ApiProperty({ description: 'Fit score (0-100)', example: 84 })
  fit_score!: number;

  @ApiProperty({
    description: 'AI-generated insight with checklist (Markdown)',
    example: '✅ **Work Experience**: Relevant experience as Cloud Engineer.\n⚠️ **Gap**: Lacks AWS certification.',
  })
  ai_insight!: string;

  @ApiProperty({
    description: 'AI-generated interview questions (Markdown)',
    example: '• Describe a time you faced a significant technical challenge...',
  })
  ai_interview!: string;

  @ApiProperty({
    description: 'AI Core Value (ICARE) analysis (Markdown)',
    example: '• **Innovation**: Developed new documentation platform...',
  })
  ai_core_value!: string;

  @ApiProperty({ description: 'Processing time in milliseconds', example: 3500, required: false })
  processing_time_ms?: number;

  @ApiProperty({ description: 'Whether result was returned from cache', example: false, required: false })
  cached?: boolean;
}

export class TriggerAnalysisResponseDto {
  @ApiProperty({ description: 'Applicant ID', example: '54f5e5b0-a4a9-42f2-bcac-0e1776599eec' })
  applicant_id!: string;

  @ApiProperty({ description: 'Fit score (0-100)', example: 84, required: false })
  fit_score?: number;

  @ApiProperty({ description: 'Summary/Insight text', required: false })
  summary?: string;

  @ApiProperty({ description: 'AI Insight (Markdown)', required: false })
  ai_insight?: string;

  @ApiProperty({ description: 'AI Interview Questions (Markdown)', required: false })
  ai_interview?: string;

  @ApiProperty({ description: 'AI Core Value Analysis (Markdown)', required: false })
  ai_core_value?: string;

  @ApiProperty({ description: 'Whether result was cached', example: false, required: false })
  cached?: boolean;

  @ApiProperty({ description: 'Processing time in ms', example: 3500, required: false })
  processing_time_ms?: number;
}
