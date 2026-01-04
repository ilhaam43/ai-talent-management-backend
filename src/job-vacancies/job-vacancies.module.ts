import { Module } from '@nestjs/common';
import { JobVacanciesService } from './job-vacancies.service';
import { JobVacanciesController } from './job-vacancies.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [JobVacanciesController],
  providers: [JobVacanciesService],
  exports: [JobVacanciesService],
})
export class JobVacanciesModule {}
