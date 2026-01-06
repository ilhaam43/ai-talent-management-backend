import { UsersModule } from './users/users.module'
import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { ConfigModule } from '@nestjs/config'
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
  ],
  controllers: [TestRbacController],
  providers: [RolesGuard],
})
export class AppModule { }