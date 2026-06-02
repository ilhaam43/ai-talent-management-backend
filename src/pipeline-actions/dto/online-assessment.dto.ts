import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOnlineAssessmentDto {
    @ApiProperty({
        description: 'Assessment link URL',
        example: 'https://assessment-vendor.com/test/12345',
    })
    @IsNotEmpty()
    @IsString()
    assessmentLink!: string;

    @ApiProperty({
        description: 'Assessment start date (YYYY-MM-DD)',
        example: '2026-04-01',
    })
    @IsNotEmpty()
    @IsDateString()
    startDate!: string;

    @ApiProperty({
        description: 'Assessment end date (YYYY-MM-DD)',
        example: '2026-04-07',
    })
    @IsNotEmpty()
    @IsDateString()
    endDate!: string;

    @ApiPropertyOptional({ description: 'Additional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
