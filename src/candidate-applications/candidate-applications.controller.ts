import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CandidateApplicationsService } from './candidate-applications.service';
import { TriggerAnalysisResponseDto } from './dto/ai-analysis.dto';

@ApiTags('Candidate Applications')
@Controller('candidate-applications')
export class CandidateApplicationsController {
  constructor(private readonly candidateApplicationsService: CandidateApplicationsService) {}

  @Post(':id/analyze')
  @ApiOperation({
    summary: 'Trigger AI Analysis for a Candidate Application',
    description:
      'Sends candidate data to n8n webhook for AI-powered analysis. ' +
      'Returns fit score, insights, interview questions, and core value evaluation. ' +
      'If analysis already exists, returns cached result to save cost.',
  })
  @ApiParam({
    name: 'id',
    description: 'Candidate Application ID (UUID)',
    example: '54f5e5b0-a4a9-42f2-bcac-0e1776599eec',
  })
  @ApiResponse({
    status: 201,
    description: 'AI analysis completed successfully',
    type: TriggerAnalysisResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  @ApiResponse({
    status: 500,
    description: 'n8n webhook error or internal server error',
  })
  async triggerAnalysis(@Param('id') id: string) {
    return this.candidateApplicationsService.triggerAiAnalysis(id);
  }
}
