import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { CandidateApplicationsModule } from '../candidate-applications/candidate-applications.module';

@Module({
    imports: [CandidateApplicationsModule],
    controllers: [AnalysisController],
})
export class AnalysisModule { }
