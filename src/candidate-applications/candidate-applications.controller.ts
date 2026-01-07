import { Controller, Post, Param, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CandidateApplicationsService } from './candidate-applications.service';
import { TriggerAnalysisResponseDto } from './dto/ai-analysis.dto';
import { TriggerAnalysisDto } from './dto/trigger-analysis.dto';

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

  @Post('analyze')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger AI Analysis for authenticated candidate',
    description:
      'Sends candidate data to n8n webhook for AI-powered analysis. ' +
      'Uses candidateId from JWT token and selectedTracks from request body. ' +
      'Returns fit score, insights, interview questions, and core value evaluation for matched jobs.',
  })
  @ApiBody({ type: TriggerAnalysisDto })
  @ApiResponse({
    status: 201,
    description: 'AI analysis triggered successfully',
    type: TriggerAnalysisResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT required',
  })
  @ApiResponse({
    status: 500,
    description: 'n8n webhook error or internal server error',
  })
  async triggerAnalysis(
    @Body() dto: TriggerAnalysisDto,
    @Req() req: any,
  ) {
    const candidateId = req.user.candidateId;
    if (!candidateId) {
      throw new Error('User does not have a candidate profile');
    }
    console.log('[DEBUG] CandidateApplicationsController received selectedTracks:', dto.selectedTracks);
    return this.candidateApplicationsService.triggerAiAnalysisByCandidate(
      candidateId,
      dto.selectedTracks,
    );
  }

  // Legacy endpoint - kept for backwards compatibility
  @Post(':id/analyze')
  @ApiOperation({ summary: '[DEPRECATED] Trigger AI analysis by application ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Analysis triggered successfully' })
  async triggerAnalysisLegacy(@Param('id') id: string) {
    return this.candidateApplicationsService.triggerAiAnalysis(id);
  }
}
