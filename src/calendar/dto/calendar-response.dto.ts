import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InterviewDataDto {
    @ApiProperty({ description: 'Interview data ID' })
    id!: string;

    @ApiPropertyOptional({ description: 'Scheduled date for interview', type: Date })
    scheduledDate?: Date | null;

    @ApiPropertyOptional({ description: 'Scheduled start time', type: Date })
    scheduledStartTime?: Date | null;

    @ApiPropertyOptional({ description: 'Scheduled end time', type: Date })
    scheduledEndTime?: Date | null;

    @ApiPropertyOptional({ description: 'Interview link (for online interviews)' })
    interviewLink?: string | null;

    @ApiPropertyOptional({ description: 'HR interview score', type: Number })
    hrInterviewScore?: number | null;

    @ApiPropertyOptional({ description: 'User interview score', type: Number })
    userInterviewScore?: number | null;

    @ApiProperty({ description: 'Interview method', enum: ['ONLINE', 'ONSITE'] })
    interviewMethod!: string;

    @ApiPropertyOptional({ description: 'Interview location (for onsite interviews)' })
    interviewLocation?: string | null;
}

export class CandidateInfoDto {
    @ApiProperty({ description: 'Candidate ID' })
    id!: string;

    @ApiPropertyOptional({ description: 'Candidate full name' })
    candidateFullname?: string | null;

    @ApiPropertyOptional({ description: 'Candidate email' })
    candidateEmail?: string | null;

    @ApiPropertyOptional({ description: 'Candidate phone number' })
    phoneNumber?: string | null;
}

export class JobVacancyInfoDto {
    @ApiProperty({ description: 'Job vacancy ID' })
    id!: string;

    @ApiPropertyOptional({ description: 'Job role name' })
    jobRoleName?: string | null;

    @ApiPropertyOptional({ description: 'Employee position' })
    employeePosition?: string | null;
}

export class ApplicationPipelineInfoDto {
    @ApiProperty({ description: 'Pipeline ID' })
    id!: string;

    @ApiProperty({ description: 'Pipeline name' })
    applicationPipeline!: string;
}

export class ApplicationPipelineStatusInfoDto {
    @ApiProperty({ description: 'Status ID' })
    id!: string;

    @ApiProperty({ description: 'Status name' })
    applicationPipelineStatus!: string;
}

export class CalendarItemDto {
    @ApiProperty({ description: 'Candidate application pipeline ID' })
    id!: string;

    @ApiProperty({ description: 'Candidate application ID' })
    candidateApplicationId!: string;

    @ApiPropertyOptional({ description: 'Notes' })
    notes?: string | null;

    @ApiProperty({ description: 'Created at timestamp', type: Date })
    createdAt!: Date;

    @ApiProperty({ description: 'Updated at timestamp', type: Date })
    updatedAt!: Date;

    @ApiProperty({ description: 'Application pipeline info', type: ApplicationPipelineInfoDto })
    applicationPipeline!: ApplicationPipelineInfoDto;

    @ApiProperty({ description: 'Application pipeline status info', type: ApplicationPipelineStatusInfoDto })
    applicationPipelineStatus!: ApplicationPipelineStatusInfoDto;

    @ApiPropertyOptional({ description: 'Interview data', type: InterviewDataDto })
    interviewData?: InterviewDataDto;

    @ApiProperty({ description: 'Candidate info', type: CandidateInfoDto })
    candidate!: CandidateInfoDto;

    @ApiProperty({ description: 'Job vacancy info', type: JobVacancyInfoDto })
    jobVacancy!: JobVacancyInfoDto;
}

export class CalendarResponseDto {
    @ApiProperty({ description: 'List of calendar items', type: [CalendarItemDto] })
    data!: CalendarItemDto[];

    @ApiProperty({ description: 'Total count of items' })
    total!: number;
}
