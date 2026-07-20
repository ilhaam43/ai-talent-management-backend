import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CandidateApplicationsService } from './candidate-applications.service';
import { CandidateApplicationsController } from './candidate-applications.controller';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, ConfigModule, EmailModule, NotificationsModule],
  controllers: [CandidateApplicationsController],
  providers: [CandidateApplicationsService],
  exports: [CandidateApplicationsService],
})
export class CandidateApplicationsModule {}

