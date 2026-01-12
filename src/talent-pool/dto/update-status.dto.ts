import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';

// Local enum matching Prisma TalentPoolHRStatus
export enum TalentPoolHRStatusValue {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  SHORTLISTED = 'SHORTLISTED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED',
}

export class UpdateHRStatusDto {
  @ApiProperty({ enum: TalentPoolHRStatusValue })
  @IsEnum(TalentPoolHRStatusValue)
  hrStatus!: TalentPoolHRStatusValue;

  @ApiPropertyOptional({ description: 'HR notes about this candidate' })
  @IsOptional()
  @IsString()
  hrNotes?: string;

  @ApiPropertyOptional({ description: 'Step candidate was processed to (e.g., "Online Test", "Interview 1")' })
  @IsOptional()
  @IsString()
  processedToStep?: string;
}

export class BulkActionDto {
  @ApiProperty({ type: [String], description: 'Array of candidate IDs to update' })
  @IsArray()
  @IsUUID('4', { each: true })
  candidateIds!: string[];

  @ApiProperty({ enum: TalentPoolHRStatusValue })
  @IsEnum(TalentPoolHRStatusValue)
  hrStatus!: TalentPoolHRStatusValue;

  @ApiPropertyOptional({ description: 'Step candidates were processed to' })
  @IsOptional()
  @IsString()
  processedToStep?: string;
}
