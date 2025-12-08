import { Module } from '@nestjs/common';
import { CVParserController } from './cv-parser.controller';
import { CVParserService } from './cv-parser.service';
import { TextExtractorService } from './parsers/text-extractor.service';
import { DataExtractorService } from './parsers/data-extractor.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [CVParserController],
  providers: [CVParserService, TextExtractorService, DataExtractorService],
  exports: [CVParserService],
})
export class CVParserModule {}


