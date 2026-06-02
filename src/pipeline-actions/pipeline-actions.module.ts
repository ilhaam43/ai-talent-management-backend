import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CVParserModule } from '../cv-parser/cv-parser.module';
import { PipelineActionsController } from './pipeline-actions.controller';
import { PipelineActionsService } from './pipeline-actions.service';
import { TextExtractorService } from '../cv-parser/parsers/text-extractor.service';
import { LLMParserService } from '../cv-parser/parsers/llm-parser.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [DatabaseModule, ConfigModule],
    controllers: [PipelineActionsController],
    providers: [PipelineActionsService, TextExtractorService, LLMParserService],
    exports: [PipelineActionsService],
})
export class PipelineActionsModule { }
