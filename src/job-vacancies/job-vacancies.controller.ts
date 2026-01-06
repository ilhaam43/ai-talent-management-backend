import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { JobVacanciesService } from './job-vacancies.service';
import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { MatchJobsCriteriaDto, MatchedJobDto } from './dto/match-jobs.dto';

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
  @ApiOperation({
    summary: 'Find matching job vacancies for AI analysis',
    description:
      'Returns a list of open job vacancies that match the given criteria. ' +
      'This endpoint is called by the n8n workflow to get jobs for candidate analysis.',
  })
  @ApiBody({
    type: MatchJobsCriteriaDto,
    description: 'Filtering criteria for job matching',
  })
  @ApiResponse({
    status: 201,
    description: 'List of matching jobs',
    type: [MatchedJobDto],
  })
  async matchJobs(@Body() body: MatchJobsCriteriaDto) {
    return this.jobVacanciesService.matchJobs(body);
  }
}
