import { IsString, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator';

export class CreateJobVacancyDto {
    @IsUUID()
    jobRoleId!: string;

    @IsUUID()
    @IsOptional()
    departmentId?: string;

    @IsUUID()
    @IsOptional()
    divisionId?: string;

    @IsUUID()
    @IsOptional()
    groupId?: string;

    @IsUUID()
    @IsOptional()
    directorateId?: string;

    @IsUUID()
    employmentTypeId!: string;

    @IsUUID()
    employeePositionId!: string;

    @IsUUID()
    @IsOptional()
    jobVacancyStatusId?: string;

    @IsUUID()
    jobVacancyDurationId!: string;

    @IsUUID()
    jobVacancyReasonId!: string;

    @IsString()
    @IsOptional()
    jobRequirement?: string;

    @IsString()
    @IsOptional()
    jobDescription?: string;

    @IsString()
    @IsOptional()
    cityLocation?: string;

    @IsNumber()
    @IsOptional()
    minSalary?: number;

    @IsNumber()
    @IsOptional()
    maxSalary?: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    skills?: string[];
}
