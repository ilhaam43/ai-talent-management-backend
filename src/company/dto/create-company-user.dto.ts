import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCompanyUserDto {
  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  name!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ description: 'User role ID (e.g. HUMAN RESOURCES, HIRING MANAGER)' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @ApiPropertyOptional({ example: 'EMP-001' })
  @IsString()
  employeeIdentificationNumber!: string;
}
