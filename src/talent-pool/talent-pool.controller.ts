import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TalentPoolService } from './talent-pool.service';
import { UploadTalentPoolDto } from './dto/upload.dto';
import { N8nCallbackDto } from './dto/callback.dto';
import { UpdateHRStatusDto, BulkActionDto } from './dto/update-status.dto';
import { ConvertCandidateDto } from './dto/convert-candidate.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// HR Status enum for API docs (matches Prisma)
enum TalentPoolHRStatusEnum {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  SHORTLISTED = 'SHORTLISTED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED',
}

// Configure local storage for uploaded files
const storage = diskStorage({
  destination: './uploads/talent-pool',
  filename: (req, file, callback) => {
    const uniqueSuffix = uuidv4();
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

@ApiTags('Talent Pool')
@Controller('talent-pool')
export class TalentPoolController {
  private readonly logger = new Logger(TalentPoolController.name);

  constructor(private readonly service: TalentPoolService) {}

  // ============================================
  // Upload Endpoints
  // ============================================

  @Post('upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload CVs for bulk screening' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage,
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(new Error('Only PDF files are allowed'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  async uploadCVs(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadTalentPoolDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      throw new BadRequestException('User ID not found in token.');
    }

    // Lookup employee from userId
    const employee = await this.service.getEmployeeByUserId(userId);
    
    if (!employee) {
      throw new BadRequestException('Employee profile not found. Only HR employees can upload.');
    }

    // Convert uploaded files to file info
    const fileInfos = files.map((file) => ({
      fileUrl: `/uploads/talent-pool/${file.filename}`,
      fileName: file.originalname,
    }));

    return this.service.createBatchUpload(employee.id, dto, fileInfos);
  }

  // ============================================
  // n8n Callback (Internal - no auth required)
  // ============================================

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Callback endpoint for n8n to send processing results' })
  async handleCallback(@Body() dto: N8nCallbackDto) {
    this.logger.log(`Received callback for queue item ${dto.queueItemId}`);
    return this.service.handleN8nCallback(dto);
  }

  // ============================================
  // Batch Endpoints
  // ============================================

  @Get('batches')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all upload batches' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async getBatches(
    @Query('skip') skip?: any,
    @Query('take') take?: any,
  ) {
    const skipNum = skip ? parseInt(skip.toString()) : 0;
    const takeNum = take ? parseInt(take.toString()) : 20;
    return this.service.getBatches(skipNum, takeNum);
  }

  @Get('batches/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get batch details (for progress polling)' })
  async getBatchById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getBatchById(id);
  }

  // ============================================
  // Candidate Endpoints
  // ============================================

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List talent pool candidates' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  @ApiQuery({ name: 'jobVacancyId', required: false, type: String })
  @ApiQuery({ name: 'hrStatus', required: false, enum: TalentPoolHRStatusEnum })
  @ApiQuery({ name: 'minScore', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getCandidates(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('batchId') batchId?: string,
    @Query('jobVacancyId') jobVacancyId?: string,
    @Query('hrStatus') hrStatus?: string,
    @Query('minScore') minScore?: number,
    @Query('search') search?: string,
  ) {
    const skipNum = skip ? parseInt(skip.toString()) : 0;
    const takeNum = take ? parseInt(take.toString()) : 20;

    return this.service.getCandidates({
      skip: skipNum,
      take: takeNum,
      batchId,
      jobVacancyId,
      hrStatus: hrStatus as any,
      minScore,
      search,
    });
  }

  // ============================================
  // Unified Candidate Query Endpoints
  // NOTE: Must be declared BEFORE :id routes to avoid 'unified' being matched as UUID
  // ============================================

  @Get('unified')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'List talent pool candidates from unified Candidate table',
    description: 'Returns candidates where isTalentPool=true with full profile data',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'batchId', required: false, type: String })
  async getUnifiedCandidates(
    @Query('skip') skip?: any,
    @Query('take') take?: any,
    @Query('batchId') batchId?: string,
  ) {
    const skipNum = skip ? parseInt(skip.toString()) : 0;
    const takeNum = take ? parseInt(take.toString()) : 20;

    return this.service.getUnifiedTalentPoolCandidates({
      skip: skipNum,
      take: takeNum,
      batchId,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single talent pool candidate with all screenings' })
  async getCandidateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCandidateById(id);
  }

  // ============================================
  // HR Action Endpoints
  // ============================================

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update HR status for a candidate' })
  async updateHRStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHRStatusDto,
  ) {
    return this.service.updateHRStatus(id, dto);
  }

  @Post('batch-action')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update status for multiple candidates' })
  async bulkAction(@Body() dto: BulkActionDto) {
    return this.service.bulkAction(dto);
  }

  // ============================================
  // Convert to Active Pipeline (NEW)
  // ============================================

  @Post('convert/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Convert talent pool candidate to active recruitment pipeline',
    description: 'Sets isTalentPool=false, updates pipeline stage, and sends password setup email.',
  })
  async convertToActivePipeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertCandidateDto,
  ) {
    return this.service.convertToActivePipeline(id, dto.targetPipelineStage, dto.targetApplicationIds);
  }



  // ============================================
  // Utility Endpoints
  // ============================================

  @Get('jobs/open')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('HUMAN RESOURCES', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all open job vacancies (for filtering)' })
  async getOpenJobs() {
    return this.service.getOpenJobs();
  }

  /**
   * PUBLIC endpoint for n8n to fetch open jobs (no auth required)
   */
  @Get('jobs/open/public')
  @ApiOperation({ 
    summary: 'Get all open job vacancies (PUBLIC - for n8n)',
    description: 'This endpoint is used by n8n workflow to get all open jobs for talent pool screening. No authentication required.',
  })
  async getOpenJobsPublic() {
    return this.service.getOpenJobs();
  }
}

