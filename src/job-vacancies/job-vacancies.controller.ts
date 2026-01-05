import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { JobVacanciesService } from './job-vacancies.service';
import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';

@Controller('job-vacancies')
export class JobVacanciesController {
  constructor(private readonly jobVacanciesService: JobVacanciesService) { }

  @Post()
  create(@Body() createJobVacancyDto: CreateJobVacancyDto) {
    return this.jobVacanciesService.create(createJobVacancyDto);
  }

  @Get()
  findAll() {
    return this.jobVacanciesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobVacanciesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobVacancyDto: UpdateJobVacancyDto) {
    return this.jobVacanciesService.update(id, updateJobVacancyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobVacanciesService.remove(id);
  }

  @Post('match')
  async matchJobs(@Body() body: { divisions?: string[]; employmentTypeId?: string }) {
    return this.jobVacanciesService.matchJobs(body);
  }
}
