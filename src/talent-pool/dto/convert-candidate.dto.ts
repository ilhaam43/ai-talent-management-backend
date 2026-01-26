import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray, IsString, IsOptional } from 'class-validator';

export class ConvertCandidateDto {
  @ApiProperty({ 
    enum: ['HR Interview', 'User Interview', 'Online Assessment'],
    description: 'Target pipeline stage for the converted candidate',
    example: 'HR Interview'
  })
  @IsEnum(['HR Interview', 'User Interview', 'Online Assessment'])
  targetPipelineStage!: 'HR Interview' | 'User Interview' | 'Online Assessment';

  @ApiProperty({
    description: 'List of specific application IDs to promote (optional). If omitted, all applications are promoted.',
    example: ['uuid1', 'uuid2'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetApplicationIds?: string[];
}
