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
      if (mimeType === 'application/pdf') {
        return await this.extractFromPDF(filePath);
      } else if (
        mimeType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
      ) {
        return await this.extractFromDOCX(filePath);
      } else {
        throw new BadRequestException(
          'Unsupported file type. Only PDF and DOCX are supported.',
        );
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to extract text from document: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from PDF file using pdf-parse
   * LLM will handle the parsing, so we just need raw text extraction
   */
  private async extractFromPDF(filePath: string): Promise<string> {
    try {
      console.log('Extracting text from PDF...');
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }
      
      console.log(`Text extraction completed. Extracted ${data.text.length} characters.`);
      return data.text;
    } catch (error: any) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }


  /**
   * Extract text from DOCX file
   */
  private async extractFromDOCX(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in DOCX');
      }
      
      return result.value;
    } catch (error: any) {
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  }
}

