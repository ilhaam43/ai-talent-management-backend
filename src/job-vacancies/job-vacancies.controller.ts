import { Controller, Post, Body } from '@nestjs/common';
import { JobVacanciesService } from './job-vacancies.service';

@Controller('job-vacancies')
export class JobVacanciesController {
  constructor(private readonly jobVacanciesService: JobVacanciesService) {}

  @Post('match')
  async matchJobs(@Body() body: { divisions?: string[]; employmentTypeId?: string }) {
    return this.jobVacanciesService.matchJobs(body);
  }
}
