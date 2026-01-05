import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { JobVacanciesService } from './job-vacancies.service';
import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('job-vacancies')
@Controller('job-vacancies')
export class JobVacanciesController {
  constructor(private readonly jobVacanciesService: JobVacanciesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new job vacancy' })
  @ApiBody({ type: CreateJobVacancyDto })
  @ApiResponse({ status: 201, description: 'Job vacancy created successfully' })
  create(@Body() createJobVacancyDto: CreateJobVacancyDto) {
    return this.jobVacanciesService.create(createJobVacancyDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all job vacancies' })
  @ApiResponse({ status: 200, description: 'Return all job vacancies' })
  findAll() {
    return this.jobVacanciesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job vacancy by ID' })
  @ApiParam({ name: 'id', description: 'Job Vacancy ID' })
  @ApiResponse({ status: 200, description: 'Return job vacancy details' })
  @ApiResponse({ status: 404, description: 'Job vacancy not found' })
  findOne(@Param('id') id: string) {
    return this.jobVacanciesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job vacancy' })
  @ApiParam({ name: 'id', description: 'Job Vacancy ID' })
  @ApiBody({ type: UpdateJobVacancyDto })
  @ApiResponse({ status: 200, description: 'Job vacancy updated successfully' })
  update(@Param('id') id: string, @Body() updateJobVacancyDto: UpdateJobVacancyDto) {
    return this.jobVacanciesService.update(id, updateJobVacancyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job vacancy' })
  @ApiParam({ name: 'id', description: 'Job Vacancy ID' })
  @ApiResponse({ status: 200, description: 'Job vacancy deleted successfully' })
  remove(@Param('id') id: string) {
    return this.jobVacanciesService.remove(id);
  }

  @Post('match')
  @ApiOperation({ summary: 'Match jobs relative to criteria' })
  @ApiBody({ schema: { type: 'object', properties: { divisions: { type: 'array', items: { type: 'string' } }, employmentTypeId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Return matched jobs' })
  async matchJobs(@Body() body: { divisions?: string[]; employmentTypeId?: string }) {
    return this.jobVacanciesService.matchJobs(body);
  }
}
