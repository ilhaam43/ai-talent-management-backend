import { Controller, Post, Param } from '@nestjs/common';
import { CandidateApplicationsService } from './candidate-applications.service';

@Controller('candidate-applications')
export class CandidateApplicationsController {
  constructor(private readonly candidateApplicationsService: CandidateApplicationsService) {}

  @Post(':id/analyze')
  async triggerAnalysis(@Param('id') id: string) {
    return this.candidateApplicationsService.triggerAiAnalysis(id);
  }
}
