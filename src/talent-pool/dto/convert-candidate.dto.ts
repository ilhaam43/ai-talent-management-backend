import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class ConvertCandidateDto {
  @ApiProperty({ 
    enum: ['HR Interview', 'User Interview', 'Online Assessment'],
    description: 'Target pipeline stage for the converted candidate',
    example: 'HR Interview'
  })
  @IsEnum(['HR Interview', 'User Interview', 'Online Assessment'])
  targetPipelineStage!: 'HR Interview' | 'User Interview' | 'Online Assessment';
}
