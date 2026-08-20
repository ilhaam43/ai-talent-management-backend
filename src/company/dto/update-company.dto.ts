import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  @ApiProperty({ example: 'Acme Global' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'http://103.125.101.187:9000/aitm-company-logo/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
