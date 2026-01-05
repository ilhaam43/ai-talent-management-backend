import { Controller, Post, Param, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CandidateApplicationsService } from './candidate-applications.service';

@ApiTags('candidate-applications')
@Controller('candidate-applications')
export class CandidateApplicationsController {
  constructor(private readonly candidateApplicationsService: CandidateApplicationsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all candidate applications' })
  @ApiResponse({ status: 200, description: 'Return all applications with relations' })
  async findAll() {
    return this.candidateApplicationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details by ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Return detailed application data' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@Param('id') id: string) {
    return this.candidateApplicationsService.findOne(id);
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Trigger AI analysis for an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Analysis triggered successfully' })
  async triggerAnalysis(@Param('id') id: string) {
    return this.candidateApplicationsService.triggerAiAnalysis(id);
  }
}
