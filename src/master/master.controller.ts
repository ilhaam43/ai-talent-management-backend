import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MasterService } from './master.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';

@ApiTags('master')
@Controller('master')
export class MasterController {
    constructor(private readonly masterService: MasterService) { }

    @Get('document-types')
    @ApiOperation({ summary: 'Get all document types' })
    @ApiResponse({ status: 200, description: 'List of document types' })
    async getDocumentTypes() {
        return this.masterService.getDocumentTypes();
    }

    @Get('candidate-last-educations')
    @ApiOperation({ summary: 'Get all candidate last educations' })
    @ApiResponse({ status: 200, description: 'List of education levels' })
    async getCandidateLastEducations() {
        return this.masterService.getCandidateLastEducations();
    }

    @Get('religions')
    @ApiOperation({ summary: 'Get all religions' })
    @ApiResponse({ status: 200, description: 'List of religions' })
    async getReligions() {
        return this.masterService.getReligions();
    }

    @Get('marital-statuses')
    @ApiOperation({ summary: 'Get all marital statuses' })
    @ApiResponse({ status: 200, description: 'List of marital statuses' })
    async getMaritalStatuses() {
        return this.masterService.getMaritalStatuses();
    }

    @Get('nationalities')
    @ApiOperation({ summary: 'Get all nationalities' })
    @ApiResponse({ status: 200, description: 'List of nationalities' })
    async getNationalities() {
        return this.masterService.getNationalities();
    }

    @Get('genders')
    @ApiOperation({ summary: 'Get all genders' })
    @ApiResponse({ status: 200, description: 'List of genders' })
    async getGenders() {
        return this.masterService.getGenders();
    }

    @Get('job-roles')
    @ApiOperation({ summary: 'Get all job roles' })
    @ApiResponse({ status: 200, description: 'List of job roles' })
    async getJobRoles() {
        return this.masterService.getJobRoles();
    }

    @Get('directorates')
    @ApiOperation({ summary: 'Get all directorates' })
    @ApiResponse({ status: 200, description: 'List of directorates' })
    async getDirectorates() {
        return this.masterService.getDirectorates();
    }

    @Get('divisions')
    @ApiOperation({ summary: 'Get all divisions (optional filter by directorate_id)' })
    @ApiQuery({ name: 'directorate_id', required: false, type: String })
    @ApiResponse({ status: 200, description: 'List of divisions' })
    async getDivisions(@Query('directorate_id') directorateId?: string) {
        return this.masterService.getDivisions(directorateId);
    }

    @Get('departments')
    @ApiOperation({ summary: 'Get all departments (optional filter by division_id)' })
    @ApiQuery({ name: 'division_id', required: false, type: String })
    @ApiResponse({ status: 200, description: 'List of departments' })
    async getDepartments(@Query('division_id') divisionId?: string) {
        return this.masterService.getDepartments(divisionId);
    }

    @Get('employee-positions')
    @ApiOperation({ summary: 'Get all employee positions (levels)' })
    @ApiResponse({ status: 200, description: 'List of employee positions' })
    async getEmployeePositions() {
        return this.masterService.getEmployeePositions();
    }

    @Get('employment-types')
    @ApiOperation({ summary: 'Get all employment types' })
    @ApiResponse({ status: 200, description: 'List of employment types' })
    async getEmploymentTypes() {
        return this.masterService.getEmploymentTypes();
    }

    @Get('skills')
    @ApiOperation({ summary: 'Get all skills' })
    @ApiResponse({ status: 200, description: 'List of skills' })
    async getSkills() {
        return this.masterService.getSkills();
    }

    @Post('skills')
    @ApiOperation({ summary: 'Create a new skill' })
    @ApiResponse({ status: 201, description: 'Skill created successfully' })
    async createSkill(@Body() dto: CreateSkillDto) {
        return this.masterService.createSkill(dto);
    }

    @Put('skills/:id')
    @ApiOperation({ summary: 'Update a skill' })
    @ApiResponse({ status: 200, description: 'Skill updated successfully' })
    async updateSkill(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
        return this.masterService.updateSkill(id, dto);
    }

    @Post('job-roles')
    @ApiOperation({ summary: 'Create a new job role' })
    @ApiResponse({ status: 201, description: 'Job role created successfully' })
    async createJobRole(@Body() dto: CreateJobRoleDto) {
        return this.masterService.createJobRole(dto);
    }

    @Put('job-roles/:id')
    @ApiOperation({ summary: 'Update a job role' })
    @ApiResponse({ status: 200, description: 'Job role updated successfully' })
    async updateJobRole(@Param('id') id: string, @Body() dto: UpdateJobRoleDto) {
        return this.masterService.updateJobRole(id, dto);
    }

    @Get('job-vacancy-reasons')
    @ApiOperation({ summary: 'Get all job vacancy reasons' })
    @ApiResponse({ status: 200, description: 'List of job vacancy reasons' })
    async getJobVacancyReasons() {
        return this.masterService.getJobVacancyReasons();
    }

    @Get('job-vacancy-durations')
    @ApiOperation({ summary: 'Get all job vacancy durations' })
    @ApiResponse({ status: 200, description: 'List of job vacancy durations' })
    async getJobVacancyDurations() {
        return this.masterService.getJobVacancyDurations();
    }
}
