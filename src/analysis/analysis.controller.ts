import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CandidateApplicationsService } from '../candidate-applications/candidate-applications.service';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
    constructor(private readonly candidateApplicationsService: CandidateApplicationsService) { }

    @Get(':id')
    @ApiOperation({ summary: 'Get analysis results (alias for application details)' })
    @ApiResponse({ status: 200, description: 'Return application details including AI analysis' })
    @ApiResponse({ status: 404, description: 'Application not found' })
    async getAnalysis(@Param('id') id: string) {
        // Map ID to candidateId search (finding all applications)
        return this.candidateApplicationsService.findAllApplicationsByCandidate(id);
    }
}
