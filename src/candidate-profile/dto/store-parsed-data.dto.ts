import { IsOptional, IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PersonalInfo,
  SocialMedia,
  Address,
  Education,
  WorkExperience,
  OrganizationExperience,
  Certification,
} from '../../cv-parser/dto/parsed-candidate-data.dto';

export class StorePersonalInfoDto implements PersonalInfo {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idCardNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}

export class StoreAddressDto implements Address {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subdistrict?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class StoreEducationDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  education!: Education[];
}

export class StoreWorkExperienceDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  workExperience!: WorkExperience[];
}

export class StoreOrganizationExperienceDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  organizationExperience!: OrganizationExperience[];
}

export class StoreSkillDto {
  @ApiProperty()
  @IsString()
  skill!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rating?: string;
}

export class StoreSkillsDto {
  @ApiProperty({ type: [StoreSkillDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreSkillDto)
  skills!: StoreSkillDto[];
}

export class StoreCertificationsDto {
  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  certifications!: Certification[];
}

export class StoreSocialMediaDto implements SocialMedia {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tiktok?: string;
}

export class StoreParsedDataDto {
  @ApiProperty({ type: Object })
  @ValidateNested()
  @Type(() => Object)
  parsedData!: {
    personalInfo?: PersonalInfo;
    socialMedia?: SocialMedia;
    address?: Address;
    education?: Education[];
    workExperience?: WorkExperience[];
    organizationExperience?: OrganizationExperience[];
    skills?: string[];
    certifications?: Certification[];
  };
}
