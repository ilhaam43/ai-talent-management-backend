import { Injectable, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as fs from 'fs/promises';

// Use pdf-parse v1.1.1 (stable version)
const pdf = require('pdf-parse');

@Injectable()
export class TextExtractorService {
  /**
   * Extract text from PDF or DOCX file based on MIME type
   */
  async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      return await this.extractTextFromBuffer(buffer, mimeType);
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to extract text from document file: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from PDF or DOCX buffer based on MIME type
   */
  async extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        return await this.extractFromPDFBuffer(buffer);
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        return await this.extractFromDOCXBuffer(buffer);
      } else {
        throw new BadRequestException(
          'Unsupported file type. Only PDF, DOC, and DOCX are supported.',
        );
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to extract text from document buffer: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from PDF buffer using pdf-parse
   */
  private async extractFromPDFBuffer(buffer: Buffer): Promise<string> {
    try {
      console.log('Extracting text from PDF buffer...');
      const data = await pdf(buffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }
      
      console.log(`Text extraction completed. Extracted ${data.text.length} characters.`);
      return data.text;
    } catch (error: any) {
      throw new Error(`PDF buffer extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  private async extractFromDOCXBuffer(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in DOCX');
      }
      
      return result.value;
    } catch (error: any) {
      throw new Error(`DOCX buffer extraction failed: ${error.message}`);
    }
  }
}


