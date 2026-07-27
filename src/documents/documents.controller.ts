import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Res,
  BadRequestException,
  ParseUUIDPipe,
  Next,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import {
  RequestPresignedUploadDto,
  PresignedUploadResponseDto,
  PresignedDownloadResponseDto,
} from '../storage/dto/presigned-url.dto';
import { multerConfig, getFolderFromDocumentType } from './config/multer.config';
import { Response, NextFunction } from 'express';
import * as fs from 'fs';

@ApiTags('documents')
@Controller('documents')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload CV or document',
    description: 'Upload documents to appropriate folders based on document type. ' +
      'Supported types: CV (pdf/docx), Ijazah (pdf), KTP (pdf/image), Transcript (pdf), Other (pdf)'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'documentTypeId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOC, DOCX for CV; PDF/Image for KTP)',
        },
        documentTypeId: {
          type: 'string',
          format: 'uuid',
          description: 'Document type UUID (CV, Ijazah, KTP, Transcript, Other)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        candidateId: { type: 'string' },
        filePath: { type: 'string' },
        documentTypeId: { type: 'string' },
        documentType: { type: 'string' },
        folder: { type: 'string' },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or document type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const candidateId = req.user.candidateId;

    if (!candidateId) {
      throw new BadRequestException('User does not have a candidate profile');
    }

    // Get document type info for response
    const documentType = await this.documentsService.getDocumentTypeById(uploadDto.documentTypeId);
    const folder = getFolderFromDocumentType(documentType?.documentType || 'other');

    const document = await this.documentsService.uploadDocument(
      candidateId,
      file,
      uploadDto.documentTypeId,
    );

    return {
      id: document.id,
      candidateId: document.candidateId,
      filePath: document.filePath,
      documentTypeId: document.documentTypeId,
      documentType: documentType?.documentType || 'Unknown',
      folder: folder,
      uploadedAt: document.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents for authenticated candidate' })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          filePath: { type: 'string' },
          documentType: { type: 'string' },
          uploadedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getDocuments(@Req() req: any) {
    const candidateId = req.user.candidateId;
    const documents = await this.documentsService.getDocumentsByCandidate(
      candidateId,
    );

    return documents.map((doc: any) => ({
      id: doc.id,
      filePath: doc.filePath,
      documentType: doc.documentType?.documentType || 'Unknown',
      uploadedAt: doc.createdAt,
    }));
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all document types' })
  @ApiResponse({
    status: 200,
    description: 'List of document types',
  })
  async getDocumentTypes() {
    return this.documentsService.getDocumentTypes();
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details' })
  @ApiResponse({
    status: 200,
    description: 'Document details',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
  ) {
    const candidateId = req.user.candidateId;
    const isHrOrAdmin = req.user.role === 'HUMAN RESOURCES' || req.user.role === 'ADMIN';
    const document = await this.documentsService.getDocumentById(
      documentId,
      candidateId || '',
      isHrOrAdmin,
    );

    return {
      id: document.id,
      filePath: document.filePath,
      documentTypeId: document.documentTypeId,
      hasExtractedText: !!document.extractedText,
      uploadedAt: document.createdAt,
    };
  }

  @Get(':documentId/download')
  @ApiOperation({ summary: 'Download document file' })
  @ApiResponse({
    status: 200,
    description: 'File download stream',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async downloadDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const candidateId = req.user.candidateId;
    const isHrOrAdmin = req.user.role === 'HUMAN RESOURCES' || req.user.role === 'ADMIN';
    const document = await this.documentsService.getDocumentById(
      documentId,
      candidateId || '',
      isHrOrAdmin,
    );

    // Check if file exists
    const fileExists = await this.documentsService.fileExists(
      document.filePath,
    );
    if (!fileExists) {
      throw new BadRequestException('File not found on server');
    }

    // Set headers for download - derive filename from path
    const fileName = document.filePath.split(/[\/\\]/).pop() || 'download';
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    // Stream file
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deleteDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
  ) {
    const candidateId = req.user.candidateId;
    return this.documentsService.deleteDocument(documentId, candidateId);
  }

  @Post('presigned-upload')
  @ApiOperation({
    summary: 'Request presigned upload URL',
    description: 'Generates a signed URL to upload a document directly to MinIO. The document status is PENDING until confirmed.'
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned upload URL generated successfully',
    type: PresignedUploadResponseDto,
  })
  async getPresignedUploadUrl(
    @Body() dto: RequestPresignedUploadDto,
    @Req() req: any,
  ): Promise<PresignedUploadResponseDto> {
    const candidateId = req.user.candidateId;
    if (!candidateId) {
      throw new BadRequestException('User does not have a candidate profile');
    }
    return this.documentsService.getPresignedUploadUrl(
      candidateId,
      dto.documentTypeId,
      dto.filename,
      dto.contentType,
      dto.sizeBytes,
      dto.module,
    );
  }

  @Post(':documentId/confirm-upload')
  @ApiOperation({
    summary: 'Confirm presigned upload complete',
    description: 'Verifies the uploaded file exists in MinIO and marks it as CONFIRMED.'
  })
  @ApiResponse({
    status: 200,
    description: 'Upload confirmed successfully',
  })
  async confirmUpload(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
  ) {
    const candidateId = req.user.candidateId;
    if (!candidateId) {
      throw new BadRequestException('User does not have a candidate profile');
    }
    return this.documentsService.confirmUpload(documentId, candidateId);
  }

  @Get(':documentId/download-url')
  @ApiOperation({
    summary: 'Get presigned download URL',
    description: 'Generates a signed URL to read/download a private document from MinIO.'
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned download URL generated successfully',
    type: PresignedDownloadResponseDto,
  })
  async getDownloadUrl(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Req() req: any,
  ): Promise<PresignedDownloadResponseDto> {
    const candidateId = req.user.candidateId;
    const isHrOrAdmin = req.user.role === 'HUMAN RESOURCES' || req.user.role === 'ADMIN';
    if (!isHrOrAdmin && !candidateId) {
      throw new BadRequestException('User does not have a candidate profile');
    }
    return this.documentsService.getPresignedDownloadUrl(documentId, candidateId || '', isHrOrAdmin);
  }
}

