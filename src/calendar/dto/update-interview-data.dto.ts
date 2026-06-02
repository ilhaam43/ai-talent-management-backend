import { IsOptional, IsString, IsDateString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewMethodEnum } from './create-interview-data.dto';

export class UpdateInterviewDataDto {
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

    @ApiPropertyOptional({
        description: 'Interview method',
        enum: InterviewMethodEnum,
        example: 'ONLINE',
    })
    @IsOptional()
    @IsEnum(InterviewMethodEnum)
    interviewMethod?: InterviewMethodEnum;

    @ApiPropertyOptional({
        description: 'Interview location (for onsite interviews)',
        example: 'Lintasarta HQ, Jakarta',
    })
    @IsOptional()
    @IsString()
    interviewLocation?: string;

    @ApiPropertyOptional({
        description: 'Name of the interviewer / PIC',
        example: 'John Doe',
    })
    @IsOptional()
    @IsString()
    interviewerName?: string;

    @ApiPropertyOptional({
        description: 'Email of the interviewer / PIC',
        example: 'john.doe@company.com',
    })
    @IsOptional()
    @IsString()
    interviewerEmail?: string;

    @ApiPropertyOptional({
        description: 'HR interview score (0-100)',
        example: 85,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    hrInterviewScore?: number;

    @ApiPropertyOptional({
        description: 'User/technical interview score (0-100)',
        example: 90,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    userInterviewScore?: number;
}
