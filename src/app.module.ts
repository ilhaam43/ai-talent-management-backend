import { UsersModule } from "./users/users.module";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { DocumentsModule } from "./documents/documents.module";
import { CVParserModule } from "./cv-parser/cv-parser.module";
import { CandidateProfileModule } from "./candidate-profile/candidate-profile.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { TestRbacController } from "./common/test-rbac.controller";
import { RolesGuard } from "./common/guards/roles.guard";

import { JobVacanciesModule } from "./job-vacancies/job-vacancies.module";
import { CandidateApplicationsModule } from "./candidate-applications/candidate-applications.module";
import { SkillsModule } from "./skills/skills.module";
import { ActionCenterModule } from "./action-center/action-center.module";
import { TalentPoolModule } from "./talent-pool/talent-pool.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { MasterModule } from "./master/master.module";
import { AnalysisModule } from "./analysis/analysis.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
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
    DashboardModule,
  ],
  controllers: [TestRbacController],
  providers: [RolesGuard],
})
export class AppModule {}
