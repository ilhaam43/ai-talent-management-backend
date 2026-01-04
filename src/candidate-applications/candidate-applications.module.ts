import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CandidateApplicationsService } from './candidate-applications.service';
import { CandidateApplicationsController } from './candidate-applications.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [CandidateApplicationsController],
  providers: [CandidateApplicationsService],
  exports: [CandidateApplicationsService],
})
export class CandidateApplicationsModule {}
