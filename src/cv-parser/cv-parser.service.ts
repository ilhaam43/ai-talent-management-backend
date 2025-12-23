import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { TextExtractorService } from './parsers/text-extractor.service';
import { DataExtractorService } from './parsers/data-extractor.service';
import { LLMParserService } from './parsers/llm-parser.service';
import { ParsedCandidateData } from './dto/parsed-candidate-data.dto';

@Injectable()
export class CVParserService {
  constructor(
    private documentsService: DocumentsService,
    private textExtractor: TextExtractorService,
    private dataExtractor: DataExtractorService,
    private llmParser: LLMParserService,
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
      document.mimeType || 'application/octet-stream',
    );

    // Save extracted text to database for future reference
    await this.documentsService.updateExtractedText(documentId, extractedText);

    // Parse structured data from text (using LLM if available)
    const parsedData = await this.parseText(extractedText);

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

    // Parse structured data from text (using LLM if available)
    const parsedData = await this.parseText(extractedText);

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
   * Uses LLM if available, falls back to regex-based extraction
   * Skips LLM for very long texts to avoid timeout
   */
  private async parseText(text: string) {
    // Try LLM parsing first if available and text is reasonable size
    // Skip LLM for very long texts (>15k chars) to avoid timeout
    const shouldUseLLM = this.llmParser.isAvailable() && text.length <= 15000;
    
    if (shouldUseLLM) {
      try {
        console.log('Using LLM for CV parsing...');
        const startTime = Date.now();
        const llmResult = await this.llmParser.parseCVWithLLM(text);
        const duration = Date.now() - startTime;
        console.log(`LLM parsing successful (${duration}ms)`);
        return llmResult;
      } catch (error: any) {
        // If timeout or other error, fall back to regex
        if (error.message?.includes('timeout')) {
          console.warn('LLM timeout, using regex parsing for faster results');
        } else {
          console.warn('LLM parsing failed, falling back to regex:', error.message);
        }
        // Fall through to regex parsing
      }
    } else if (this.llmParser.isAvailable() && text.length > 15000) {
      console.log('Text too long for LLM, using regex parsing for faster results');
    }

    // Fallback to regex-based parsing
    console.log('Using regex-based parsing...');
    const socialMedia = this.dataExtractor.extractSocialMedia(text);
    const address = this.dataExtractor.extractAddress(text);
    
    return {
      personalInfo: this.dataExtractor.extractPersonalInfo(text),
      socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
      address: Object.keys(address).length > 0 ? address : undefined,
      education: this.dataExtractor.extractEducation(text),
      workExperience: this.dataExtractor.extractWorkExperience(text),
      organizationExperience: this.dataExtractor.extractOrganizationExperience(text),
      skills: this.dataExtractor.extractSkills(text),
      certifications: this.dataExtractor.extractCertifications(text),
    };
  }
}


