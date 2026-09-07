import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyLimitsDto {
  @ApiProperty({ description: 'Enable the rolling 5-hour message limit' })
  @IsBoolean()
  fiveHourEnabled!: boolean;

  @ApiPropertyOptional({
    description: 'Max messages per member in a rolling 5-hour window',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  fiveHourLimit?: number;

  @ApiProperty({ description: 'Enable the rolling 1-week message limit' })
  @IsBoolean()
  weekEnabled!: boolean;

  @ApiPropertyOptional({
    description: 'Max messages per member in a rolling 7-day window',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  weekLimit?: number;
}
