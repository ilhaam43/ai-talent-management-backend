import { Controller, Post, Param, Get } from '@nestjs/common';
import { CandidateApplicationsService } from './candidate-applications.service';

@Controller('candidate-applications')
export class CandidateApplicationsController {
  constructor(private readonly candidateApplicationsService: CandidateApplicationsService) { }

  @Get()
  async findAll() {
    return this.candidateApplicationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.candidateApplicationsService.findOne(id);
  }


  @Post(':id/analyze')
  async triggerAnalysis(@Param('id') id: string) {
    return this.candidateApplicationsService.triggerAiAnalysis(id);
  }
}
