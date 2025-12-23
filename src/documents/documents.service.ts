import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CandidateDocumentEntity } from './entities/candidate-document.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upload document and create database record
   */
  async uploadDocument(
    candidateId: string,
    file: Express.Multer.File,
    documentTypeId: string,
  ): Promise<CandidateDocumentEntity> {
    try {
      // Verify document type exists
      const documentType = await this.prisma.documentType.findUnique({
        where: { id: documentTypeId },
      });

      if (!documentType) {
        // Delete uploaded file if document type is invalid
        await this.deleteFile(file.path);
        throw new NotFoundException('Document type not found');
      }

      // Create document record
      const document = await this.prisma.candidateDocument.create({
        data: {
          candidateId,
          documentTypeId,
          originalFilename: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });

      return document;
    } catch (error) {
      // Clean up file if database operation fails
      if (file?.path) {
        await this.deleteFile(file.path).catch(() => {
          // Ignore cleanup errors
        });
      }
      throw error;
    }
  }

  /**
   * Get all documents for a candidate
   */
  async getDocumentsByCandidate(
    candidateId: string,
  ): Promise<CandidateDocumentEntity[]> {
    const documents = await this.prisma.candidateDocument.findMany({
      where: { candidateId },
      include: {
        documentType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return documents;
  }

  /**
   * Get single document by ID with authorization check
   */
  async getDocumentById(
    documentId: string,
    candidateId: string,
  ): Promise<CandidateDocumentEntity> {
    const document = await this.prisma.candidateDocument.findUnique({
      where: { id: documentId },
      include: {
        documentType: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Authorization check
    if (document.candidateId !== candidateId) {
      throw new ForbiddenException(
        'You do not have permission to access this document',
      );
    }

    return document;
  }

  /**
   * Delete document and file
   */
  async deleteDocument(
    documentId: string,
    candidateId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Get document with authorization check
    const document = await this.getDocumentById(documentId, candidateId);

    try {
      // Delete file from disk
      await this.deleteFile(document.filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await this.prisma.candidateDocument.delete({
      where: { id: documentId },
    });

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  /**
   * Get file path for document (with authorization)
   */
  async getDocumentFilePath(
    documentId: string,
    candidateId: string,
  ): Promise<string> {
    const document = await this.getDocumentById(documentId, candidateId);
    return document.filePath;
  }

  /**
   * Update extracted text for a document
   */
  async updateExtractedText(
    documentId: string,
    extractedText: string,
  ): Promise<void> {
    await this.prisma.candidateDocument.update({
      where: { id: documentId },
      data: { extractedText },
    });
  }

  /**
   * Get all document types
   */
  async getDocumentTypes() {
    return this.prisma.documentType.findMany({
      orderBy: { documentType: 'asc' },
    });
  }

  /**
   * Helper: Delete file from filesystem
   */
  private async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        // File not found is ok, throw other errors
        throw error;
      }
    }
  }

  /**
   * Helper: Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}


