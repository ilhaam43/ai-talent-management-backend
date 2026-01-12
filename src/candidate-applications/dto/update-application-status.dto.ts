import { IsUUID, IsNotEmpty, IsOptional, IsString, IsDateString, IsNumber, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'Application pipeline stage ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  applicationPipelineId!: string;

  @ApiProperty({
    description: 'Application pipeline status ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  applicationPipelineStatusId!: string;

  @ApiPropertyOptional({
    description: 'Notes about this pipeline stage',
    example: 'Candidate showed excellent problem-solving skills',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  // Scheduling fields
  @ApiPropertyOptional({
    description: 'Scheduled date for this stage (YYYY-MM-DD)',
    example: '2025-09-01',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({
    description: 'Start time (ISO 8601 format)',
    example: '2025-09-01T09:00:00+07:00',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.scheduledDate !== undefined)
  scheduledStartTime?: string;

  @ApiPropertyOptional({
    description: 'End time (ISO 8601 format)',
    example: '2025-09-01T12:00:00+07:00',
  })
  @IsOptional()
  @IsDateString()
  scheduledEndTime?: string;

  @ApiPropertyOptional({
    description: 'Link for online assessment or meeting',
    example: 'https://lintasarta.assessment.com/candidate/abc123',
  })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({
    description: 'Location of the event',
    example: 'Teams',
    enum: ['Online', 'Office', 'Teams', 'Zoom', 'Google Meet', 'Other'],
  })
  @IsOptional()
  @IsString()
  location?: string;

  // Stage-specific data
  @ApiPropertyOptional({
    description: 'Score for this stage (0-100)',
    example: 94.5,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  stageScore?: number;

  @ApiPropertyOptional({
    description: 'ID of the employee conducting this stage (interviewer/PIC)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  interviewerId?: string;
}
