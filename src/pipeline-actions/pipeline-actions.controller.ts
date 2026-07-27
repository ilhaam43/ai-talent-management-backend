import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PipelineActionsService } from './pipeline-actions.service';
import { QualifyDto, DisqualifyDto } from './dto/qualify.dto';
import { CreateOnlineAssessmentDto } from './dto/online-assessment.dto';
import { getMulterPdfConfig } from '../common/config/multer-pdf.config';

@ApiTags('pipeline-actions')
@Controller('pipeline-actions')
export class PipelineActionsController {
    constructor(private readonly service: PipelineActionsService) { }

    // ─── Qualify / Disqualify ───────────────────────────────────────────

    @Post(':pipelineId/qualify')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mark pipeline stage as Qualified' })
    @ApiResponse({ status: 200, description: 'Stage marked as Qualified' })
    async qualify(
        @Param('pipelineId') pipelineId: string,
        @Body() dto: QualifyDto,
    ) {
        return this.service.qualify(pipelineId, dto);
    }

    @Post(':pipelineId/disqualify')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mark pipeline stage as Not Qualified' })
    @ApiResponse({ status: 200, description: 'Stage marked as Not Qualified' })
    async disqualify(
        @Param('pipelineId') pipelineId: string,
        @Body() dto: DisqualifyDto,
    ) {
        return this.service.disqualify(pipelineId, dto);
    }

    // ─── Online Assessment ─────────────────────────────────────────────

    @Post(':pipelineId/online-assessment')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create online assessment data (link, dates)' })
    @ApiResponse({ status: 201, description: 'Assessment data created' })
    async createOnlineAssessment(
        @Param('pipelineId') pipelineId: string,
        @Body() dto: CreateOnlineAssessmentDto,
    ) {
        return this.service.createOnlineAssessment(pipelineId, dto);
    }

    @Post(':pipelineId/upload-result')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Upload vendor assessment result PDF' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FileInterceptor('file', getMulterPdfConfig('assessment-results')),
    )
    async uploadResult(
        @Param('pipelineId') pipelineId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.service.uploadResult(pipelineId, file);
    }

    @Post(':pipelineId/parse-result')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Parse uploaded vendor result PDF (summary only)' })
    @ApiResponse({ status: 200, description: 'Result parsed and summary saved' })
    async parseResult(@Param('pipelineId') pipelineId: string) {
        return this.service.parseResult(pipelineId);
    }

    @Get(':pipelineId/result-download-url')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get presigned download URL for vendor assessment result' })
    async getResultDownloadUrl(@Param('pipelineId') pipelineId: string) {
        return this.service.getResultDownloadUrl(pipelineId);
    }

    // ─── Query ─────────────────────────────────────────────────────────

    @Get('stages/:applicationId')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('HUMAN RESOURCES')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all pipeline stages for a candidate application' })
    async getStages(@Param('applicationId') applicationId: string) {
        return this.service.getStages(applicationId);
    }
}
