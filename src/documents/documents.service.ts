import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CandidateDocumentEntity } from './entities/candidate-document.entity';
import { getFolderFromDocumentType } from './config/multer.config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) { }

  /**
   * Upload document and create database record (Dual-write for local and MinIO)
   */
  async uploadDocument(
    candidateId: string,
    file: Express.Multer.File,
    documentTypeId: string,
  ): Promise<CandidateDocumentEntity> {
    let uploadedKey: string | null = null;
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

      // Read file to buffer and upload to MinIO
      const buffer = await fs.readFile(file.path);
      const folder = getFolderFromDocumentType(documentType.documentType);
      uploadedKey = this.storageService.buildKey(folder, candidateId, file.originalname);
      await this.storageService.uploadBuffer(uploadedKey, buffer, file.mimetype);

      // Create document record with MinIO metadata
      const document = await this.prisma.candidateDocument.create({
        data: {
          candidateId,
          documentTypeId,
          filePath: file.path,
          objectKey: uploadedKey,
          bucket: this.storageService.getDocumentsBucket(),
          storageType: 'MINIO',
          mimeType: file.mimetype,
          sizeBytes: file.size,
          originalName: file.originalname,
          uploadStatus: 'CONFIRMED',
        },
      });

      // Update candidate model if the document is a CV/Resume
      if (documentType.documentType?.toLowerCase().includes('cv') || documentType.documentType?.toLowerCase().includes('resume')) {
        await this.prisma.candidate.update({
          where: { id: candidateId },
          data: {
            cvFileUrl: uploadedKey,
            cvFileName: file.originalname,
          },
        });
      }

      return document;
    } catch (error) {
      // Clean up local file if database/storage operation fails
      if (file?.path) {
        await this.deleteFile(file.path).catch(() => {});
      }
      // Clean up MinIO file if database operation fails after upload
      if (uploadedKey) {
        await this.storageService.deleteObject(uploadedKey).catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Request presigned upload URL for candidate documents
   */
  async getPresignedUploadUrl(
    candidateId: string,
    documentTypeId: string,
    filename: string,
    contentType: string,
    sizeBytes: number,
    moduleName?: string,
  ) {
    // 1. Verify document type exists
    const documentType = await this.prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });
    if (!documentType) {
      throw new NotFoundException('Document type not found');
    }

    const folder = getFolderFromDocumentType(documentType.documentType);

    // Validate extension
    if (!this.storageService.isExtensionAllowed(filename, folder)) {
      throw new BadRequestException(`File extension not allowed for document type ${documentType.documentType}`);
    }

    // 2. Generate key
    const folderKey = moduleName || folder;
    const objectKey = this.storageService.buildKey(folderKey, candidateId, filename);

    // 3. Create document record as PENDING
    const dummyPath = `./uploads/documents/${folder}/${path.basename(objectKey)}`;
    const document = await this.prisma.candidateDocument.create({
      data: {
        candidateId,
        documentTypeId,
        filePath: dummyPath, // legacy path fallback
        objectKey,
        bucket: this.storageService.getDocumentsBucket(),
        storageType: 'MINIO',
        mimeType: contentType,
        sizeBytes: sizeBytes,
        originalName: filename,
        uploadStatus: 'PENDING',
      },
    });

    // 4. Generate presigned upload URL
    const uploadUrl = await this.storageService.getPresignedUploadUrl(objectKey, contentType, 900); // 15 min

    return {
      uploadUrl,
      documentId: document.id,
      objectKey,
      expiresIn: 900,
    };
  }

  /**
   * Confirm presigned upload completed
   */
  async confirmUpload(documentId: string, candidateId: string) {
    const document = await this.getDocumentById(documentId, candidateId);

    if (document.storageType !== 'MINIO' || !document.objectKey) {
      throw new BadRequestException('This document is not stored in MinIO');
    }

    // Verify object exists in MinIO
    const exists = await this.storageService.objectExists(document.objectKey);
    if (!exists) {
      throw new BadRequestException('File was not uploaded to storage');
    }

    // Update status to CONFIRMED
    const updatedDoc = await this.prisma.candidateDocument.update({
      where: { id: documentId },
      data: { uploadStatus: 'CONFIRMED' },
      include: { documentType: true },
    });

    // Update candidate model if the document is a CV/Resume
    if (updatedDoc.documentType?.documentType?.toLowerCase().includes('cv') || updatedDoc.documentType?.documentType?.toLowerCase().includes('resume')) {
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          cvFileUrl: updatedDoc.objectKey,
          cvFileName: updatedDoc.originalName,
        },
      });
    }

    return updatedDoc;
  }

  /**
   * Get presigned download URL
   */
  async getPresignedDownloadUrl(documentId: string, candidateId: string) {
    const document = await this.getDocumentById(documentId, candidateId);

    if (document.storageType === 'MINIO' && document.objectKey) {
      const url = await this.storageService.getPresignedDownloadUrl(document.objectKey, 300); // 5 min
      return {
        url,
        expiresIn: 300,
      };
    }

    // Fallback: build backend endpoint download URL
    const host = process.env.BACKEND_URL || '';
    return {
      url: `${host}/documents/${documentId}/download`,
      expiresIn: 300,
    };
  }

  /**
   * Get all documents for a candidate
   */
  async getDocumentsByCandidate(
    candidateId: string,
  ): Promise<CandidateDocumentEntity[]> {
    const documents = await this.prisma.candidateDocument.findMany({
      where: { candidateId, uploadStatus: 'CONFIRMED' },
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
      // Delete file from disk if it exists
      if (document.filePath) {
        await this.deleteFile(document.filePath).catch(() => {});
      }

      // Delete from MinIO if it exists
      if (document.storageType === 'MINIO' && document.objectKey) {
        await this.storageService.deleteObject(document.objectKey).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
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
   * Get document type by ID
   */
  async getDocumentTypeById(id: string) {
    return this.prisma.documentType.findUnique({
      where: { id },
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
        throw error;
      }
    }
  }

  /**
   * Helper: Check if file exists
   */
  async fileExists(filePath: string, storageType: 'LOCAL' | 'MINIO' = 'LOCAL', objectKey?: string | null): Promise<boolean> {
    if (storageType === 'MINIO' && objectKey) {
      return this.storageService.objectExists(objectKey);
    }
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}



