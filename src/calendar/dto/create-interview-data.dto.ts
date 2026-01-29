import { IsUUID, IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InterviewMethodEnum {
    ONLINE = 'ONLINE',
    ONSITE = 'ONSITE',
}

export class CreateInterviewDataDto {
    @ApiProperty({
        description: 'Candidate application pipeline ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    @IsNotEmpty()
    candidateApplicationPipelineId!: string;

    @ApiPropertyOptional({
        description: 'Scheduled date for interview (YYYY-MM-DD)',
        example: '2026-02-01',
    })
    @IsOptional()
    @IsDateString()
    scheduledDate?: string;

    @ApiPropertyOptional({
        description: 'Scheduled start time (ISO 8601 format)',
        example: '2026-02-01T09:00:00+07:00',
    })
    @IsOptional()
    @IsDateString()
    scheduledStartTime?: string;

    @ApiPropertyOptional({
        description: 'Scheduled end time (ISO 8601 format)',
        example: '2026-02-01T12:00:00+07:00',
    })
    @IsOptional()
    @IsDateString()
    scheduledEndTime?: string;

    @ApiPropertyOptional({
        description: 'Interview link (for online interviews)',
        example: 'https://meet.google.com/abc-defg-hij',
    })
    @IsOptional()
    @IsString()
    interviewLink?: string;

    @ApiProperty({
        description: 'Interview method',
        enum: InterviewMethodEnum,
        example: 'ONLINE',
    })
    @IsNotEmpty()
    @IsEnum(InterviewMethodEnum)
    interviewMethod!: InterviewMethodEnum;

    @ApiPropertyOptional({
        description: 'Interview location (for onsite interviews)',
        example: 'Lintasarta HQ, Jakarta',
    })
    @IsOptional()
    @IsString()
    interviewLocation?: string;
}
