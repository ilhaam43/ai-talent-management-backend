import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray, IsString, IsOptional } from 'class-validator';

export enum ConvertPipelineStageEnum {
  HR_INTERVIEW = 'HR Interview',
  USER_INTERVIEW_1 = 'User Interview 1',
  USER_INTERVIEW_2 = 'User Interview 2',
  USER_INTERVIEW_3 = 'User Interview 3',
  ONLINE_ASSESSMENT = 'Online Assessment'
}

export class ConvertCandidateDto {
  @ApiProperty({ 
    enum: ConvertPipelineStageEnum,
    description: 'Target pipeline stage for the converted candidate',
    example: ConvertPipelineStageEnum.HR_INTERVIEW
  })
  @IsEnum(ConvertPipelineStageEnum)
  targetPipelineStage!: ConvertPipelineStageEnum;

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
