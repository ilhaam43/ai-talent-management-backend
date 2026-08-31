import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCompanyUserDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'New role ID to assign' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ example: 'New Employee ID Number' })
  @IsOptional()
  @IsString()
  employeeIdentificationNumber?: string;
}
