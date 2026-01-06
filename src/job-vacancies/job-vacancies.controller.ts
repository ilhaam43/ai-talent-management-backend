import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JobVacanciesService } from './job-vacancies.service';
import { MatchJobsCriteriaDto, MatchedJobDto } from './dto/match-jobs.dto';

@ApiTags('Job Vacancies')
@Controller('job-vacancies')
export class JobVacanciesController {
  constructor(private readonly jobVacanciesService: JobVacanciesService) {}

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
