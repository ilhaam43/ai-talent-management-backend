import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestPresignedUploadDto {
  @ApiProperty({ description: 'Document type ID' })
  @IsNotEmpty()
  @IsString()
  documentTypeId!: string;

  @ApiProperty({ description: 'Original filename', example: 'my-cv.pdf' })
  @IsNotEmpty()
  @IsString()
  filename!: string;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @IsNotEmpty()
  @IsString()
  contentType!: string;

  @ApiProperty({ description: 'File size in bytes', example: 102400 })
  @IsNotEmpty()
  @IsNumber()
  sizeBytes!: number;

  @ApiPropertyOptional({ description: 'Module/context for key prefix', example: 'cv' })
  @IsOptional()
  @IsString()
  module?: string;
}

export class PresignedUploadResponseDto {
  @ApiProperty({ description: 'Presigned upload URL — PUT file bytes here' })
  uploadUrl!: string;

  @ApiProperty({ description: 'Created document record ID' })
  documentId!: string;

  @ApiProperty({ description: 'MinIO object key' })
  objectKey!: string;

  @ApiProperty({ description: 'Seconds until URL expires' })
  expiresIn!: number;
}

export class PresignedDownloadResponseDto {
  @ApiProperty({ description: 'Presigned download URL' })
  url!: string;

  @ApiProperty({ description: 'Seconds until URL expires' })
  expiresIn!: number;
}
