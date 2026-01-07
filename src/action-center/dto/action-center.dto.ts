import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export enum TaskTypeFilter {
    JOB_ROLE_REQUEST = 'JOB_ROLE_REQUEST',
    ONLINE_ASSESSMENT = 'ONLINE_ASSESSMENT',
    INTERVIEW = 'INTERVIEW',
    OFFER_LETTER = 'OFFER_LETTER',
    MCU = 'MCU',
    ONBOARDING = 'ONBOARDING',
}

export class ActionCenterFilterDto {
    @ApiPropertyOptional({ enum: TaskTypeFilter, description: 'Filter by task type' })
    @IsOptional()
    @IsEnum(TaskTypeFilter)
    taskType?: TaskTypeFilter;

    @ApiPropertyOptional({ description: 'Filter by job vacancy status (e.g., OPEN, DRAFT)' })
    @IsOptional()
    @IsString()
    jobVacancyStatus?: string;

    @ApiPropertyOptional({ description: 'Filter by department ID' })
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ description: 'Search by job role name' })
    @IsOptional()
    @IsString()
    search?: string;
}

export class ActionCenterSummaryDto {
    @ApiProperty({ description: 'Number of applications pending approval' })
    pendingApproval!: number;

    @ApiProperty({ description: 'Change from yesterday for pending approval' })
    pendingApprovalChange!: number;

    @ApiProperty({ description: 'Number of applications requiring scheduling' })
    schedulingNeeded!: number;

    @ApiProperty({ description: 'Change from yesterday for scheduling needed' })
    schedulingNeededChange!: number;

    @ApiProperty({ description: 'Number of applications waiting feedback' })
    waitingFeedback!: number;

    @ApiProperty({ description: 'Change from yesterday for waiting feedback' })
    waitingFeedbackChange!: number;

    @ApiProperty({ description: 'Number of applications for onboarding soon' })
    onboardingSoon!: number;

    @ApiProperty({ description: 'Change from yesterday for onboarding soon' })
    onboardingSoonChange!: number;
}

export class ActionCenterTaskDto {
    @ApiProperty({ description: 'Application ID' })
    id!: string;

    @ApiProperty({ description: 'Job role name' })
    jobRole!: string;

    @ApiProperty({ description: 'PIC (Person in Charge) - typically HR or hiring manager' })
    pic!: string;

    @ApiProperty({ description: 'Department name' })
    department!: string;

    @ApiProperty({ description: 'Task type/action required' })
    task!: string;

    @ApiProperty({ description: 'Date when action is required' })
    dateRequired!: Date;

    @ApiProperty({ description: 'Candidate name' })
    candidateName!: string;

    @ApiProperty({ description: 'Current pipeline stage' })
    pipelineStage!: string;

    @ApiProperty({ description: 'Job vacancy status' })
    jobVacancyStatus!: string;
}
