import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CVParserController } from './cv-parser.controller';
import { CVParserService } from './cv-parser.service';
import { TextExtractorService } from './parsers/text-extractor.service';
import { DataExtractorService } from './parsers/data-extractor.service';
import { LLMParserService } from './parsers/llm-parser.service';
import { DocumentsModule } from '../documents/documents.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DocumentsModule, ConfigModule, DatabaseModule],
  controllers: [CVParserController],
  providers: [
    CVParserService,
    TextExtractorService,
    DataExtractorService,
    LLMParserService,
  ],
  exports: [CVParserService],
})
export class CVParserModule {}


