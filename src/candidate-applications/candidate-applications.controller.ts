import { Controller, Post, Param, Get, Body, Req, UseGuards, Patch, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CandidateApplicationsService } from './candidate-applications.service';
import { TriggerAnalysisResponseDto } from './dto/ai-analysis.dto';
import { TriggerAnalysisDto } from './dto/trigger-analysis.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationResponseDto, DashboardSummaryDto } from './dto/application-response.dto';
import { RecruitmentProcessDto } from './dto/recruitment-process.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('candidate-applications')
@Controller('candidate-applications')
export class CandidateApplicationsController {
  constructor(private readonly candidateApplicationsService: CandidateApplicationsService) { }

  // === CANDIDATE ENDPOINTS ===

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Candidate applies for a job',
    description: 'Candidate can apply for ONE job only. 6-month cooldown after rejection. Automatically placed in pipeline based on AI match status.'
  })
  @ApiBody({ type: CreateApplicationDto })
  @ApiResponse({ status: 201, description: 'Application created successfully', type: ApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Already applied or job not open' })
  @ApiResponse({ status: 404, description: 'Job vacancy not found' })
  async createApplication(@Body() dto: CreateApplicationDto, @Req() req: any) {
    const candidateId = req.user.candidateId;
    if (!candidateId) {
      throw new Error('User does not have a candidate profile');
    }
    return this.candidateApplicationsService.createApplication(candidateId, dto);
  }

  @Get('my-application')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get candidate\'s application',
    description: 'Returns the candidate\'s application (max 1 per candidate) with pipeline history and schedule details'
  })
  @ApiResponse({ status: 200, description: 'Application details', type: ApplicationResponseDto })
  @ApiResponse({ status: 200, description: 'No application found (returns null)' })
  async getMyApplication(@Req() req: any) {
    const candidateId = req.user.candidateId;
    if (!candidateId) {
      throw new Error('User does not have a candidate profile');
    }
    return this.candidateApplicationsService.findAllByCandidate(candidateId);
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

  // === HR ENDPOINTS === 

  @Get('hr/summary')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'HR Dashboard Summary',
    description: 'Get summary metrics for HR dashboard: total, pass, partially pass, and not pass candidates'
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary', type: DashboardSummaryDto })
  async getHRDashboardSummary() {
    return this.candidateApplicationsService.getHRDashboardSummary();
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all candidate applications (HR only)' })
  @ApiQuery({ name: 'aiMatchStatus', required: false, description: 'Filter by AI match status' })
  @ApiQuery({ name: 'pipelineId', required: false, description: 'Filter by pipeline stage ID' })
  @ApiQuery({ name: 'statusId', required: false, description: 'Filter by status ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by candidate name' })
  @ApiResponse({ status: 200, description: 'Return all applications with relations' })
  async findAll(
    @Query('aiMatchStatus') aiMatchStatus?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('statusId') statusId?: string,
    @Query('search') search?: string,
  ) {
    return this.candidateApplicationsService.findAll({
      aiMatchStatus,
      pipelineId,
      statusId,
      search,
    });
  }

  @Get(':id/recruitment-process')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detailed recruitment process for a candidate',
    description: 'Shows all stages with scores, schedules, interviewers, and notes'
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Recruitment process details', type: RecruitmentProcessDto })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getRecruitmentProcess(@Param('id') id: string) {
    return this.candidateApplicationsService.getRecruitmentProcess(id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get application details by ID (HR only)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Return detailed application data' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@Param('id') id: string) {
    return this.candidateApplicationsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update application status with optional scheduling',
    description: 'HR can move candidate to next stage, schedule interviews/assessments, assign interviewers, and add scores'
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ type: UpdateApplicationStatusDto })
  @ApiResponse({ status: 200, description: 'Application updated successfully', type: ApplicationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid pipeline or status ID' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateApplicationStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.candidateApplicationsService.updateApplicationStatus(id, dto);
  }

  // === LEGACY ENDPOINT ===

  @Post(':id/analyze')
  @ApiOperation({ summary: '[DEPRECATED] Trigger AI analysis by application ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Analysis triggered successfully' })
  async triggerAnalysisLegacy(@Param('id') id: string) {
    return this.candidateApplicationsService.triggerAiAnalysis(id);
  }
}
