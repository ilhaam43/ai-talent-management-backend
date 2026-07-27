import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';
import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { DocumentsModule } from './documents/documents.module'
import { CVParserModule } from './cv-parser/cv-parser.module'
import { CandidateProfileModule } from './candidate-profile/candidate-profile.module'
import { CandidatesModule } from './candidates/candidates.module'
import { TestRbacController } from './common/test-rbac.controller'
import { RolesGuard } from './common/guards/roles.guard'

import { JobVacanciesModule } from './job-vacancies/job-vacancies.module';
import { CandidateApplicationsModule } from './candidate-applications/candidate-applications.module';
import { SkillsModule } from './skills/skills.module';
import { ActionCenterModule } from './action-center/action-center.module';
import { TalentPoolModule } from './talent-pool/talent-pool.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MasterModule } from './master/master.module';
import { AnalysisModule } from './analysis/analysis.module';
import { CalendarModule } from './calendar/calendar.module';
import { DashboardModule } from "./dashboard/dashboard.module";
import { AiAssistantModule } from "./ai-assistant/ai-assistant.module";
import { PipelineActionsModule } from './pipeline-actions/pipeline-actions.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CandidateProfileModule,
    CVParserModule,
    DocumentsModule,
    CandidatesModule,
    JobVacanciesModule,
    CandidateApplicationsModule,
    SkillsModule,
    ActionCenterModule,
    TalentPoolModule,
    NotificationsModule,
    MasterModule,
    AnalysisModule,
    CalendarModule,
    DashboardModule,
    AiAssistantModule,
    PipelineActionsModule,
  ],
  controllers: [TestRbacController],
  providers: [RolesGuard],
})
export class AppModule { }