import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { TextExtractorService } from './parsers/text-extractor.service';
import { DataExtractorService } from './parsers/data-extractor.service';
import { ParsedCandidateData } from './dto/parsed-candidate-data.dto';

@Injectable()
export class CVParserService {
  constructor(
    private documentsService: DocumentsService,
    private textExtractor: TextExtractorService,
    private dataExtractor: DataExtractorService,
  ) {}

  /**
   * Parse document by ID
   */
  async parseDocument(
    documentId: string,
    candidateId: string,
  ): Promise<ParsedCandidateData> {
    // Get document with authorization check
    const document = await this.documentsService.getDocumentById(
      documentId,
      candidateId,
    );

    // Check if file exists
    const fileExists = await this.documentsService.fileExists(document.filePath);
    if (!fileExists) {
      throw new NotFoundException('Document file not found on server');
    }

    // Extract text from document
    const extractedText = await this.textExtractor.extractText(
      document.filePath,
      document.mimeType,
    );

    // Save extracted text to database for future reference
    await this.documentsService.updateExtractedText(documentId, extractedText);

    // Parse structured data from text
    const parsedData = this.parseText(extractedText);

    return {
      extractedText,
      parsedData,
    };
  }

  /**
   * Parse uploaded file directly (without storing document record)
   */
  async parseFile(
    file: Express.Multer.File,
  ): Promise<ParsedCandidateData> {
    // Extract text from file
    const extractedText = await this.textExtractor.extractText(
      file.path,
      file.mimetype,
    );

    // Parse structured data from text
    const parsedData = this.parseText(extractedText);

    // Clean up temporary file
    try {
      const fs = require('fs/promises');
      await fs.unlink(file.path);
    } catch (error) {
      // Ignore cleanup errors
      console.error('Failed to cleanup temporary file:', error);
    }

    return {
      extractedText,
      parsedData,
    };
  }

  /**
   * Parse text and extract structured data
   */
  private parseText(text: string) {
    return {
      personalInfo: this.dataExtractor.extractPersonalInfo(text),
      education: this.dataExtractor.extractEducation(text),
      workExperience: this.dataExtractor.extractWorkExperience(text),
      organizationExperience: this.dataExtractor.extractOrganizationExperience(text),
      skills: this.dataExtractor.extractSkills(text),
      certifications: this.dataExtractor.extractCertifications(text),
    };
  }
}


