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
import { multerConfig } from './config/multer.config';
import { Response } from 'express';
import * as fs from 'fs';

@ApiTags('documents')
@Controller('documents')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CV or document' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'documentTypeId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CV file (PDF, DOC, DOCX)',
        },
        documentTypeId: {
          type: 'string',
          format: 'uuid',
          description: 'Document type UUID',
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
        fileName: { type: 'string' },
        filePath: { type: 'string' },
        fileSize: { type: 'number' },
        mimeType: { type: 'string' },
        documentTypeId: { type: 'string' },
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
          fileName: { type: 'string' },
          fileSize: { type: 'number' },
          mimeType: { type: 'string' },
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
    const document = await this.documentsService.getDocumentById(
      documentId,
      candidateId,
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
    const document = await this.documentsService.getDocumentById(
      documentId,
      candidateId,
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
}


