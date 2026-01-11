import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUrl, MaxLength } from 'class-validator';

// Local enum matching Prisma TalentPoolSourceType
export enum TalentPoolSourceTypeValue {
  MANUAL_UPLOAD = 'MANUAL_UPLOAD',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  ONEDRIVE = 'ONEDRIVE',
}

export class UploadTalentPoolDto {
  @ApiPropertyOptional({ description: 'Optional name for this batch upload' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  batchName?: string;

  @ApiProperty({ enum: TalentPoolSourceTypeValue, description: 'Source type of the upload' })
  @IsEnum(TalentPoolSourceTypeValue)
  sourceType!: TalentPoolSourceTypeValue;

  @ApiPropertyOptional({ description: 'Google Drive or OneDrive folder URL (if applicable)' })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}

export class FileUploadInfoDto {
  @ApiProperty()
  @IsString()
  fileUrl!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;
}
