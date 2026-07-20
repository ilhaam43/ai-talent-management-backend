import { Module } from '@nestjs/common';
import { JobVacanciesService } from './job-vacancies.service';
import { JobVacanciesController } from './job-vacancies.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [JobVacanciesController],
  providers: [JobVacanciesService],
  exports: [JobVacanciesService],
})
export class JobVacanciesModule {}
