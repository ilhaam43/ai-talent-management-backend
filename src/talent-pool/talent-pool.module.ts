import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TalentPoolController } from './talent-pool.controller';
import { TalentPoolService } from './talent-pool.service';
import { TalentPoolRepository } from './talent-pool.repository';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, ConfigModule, NotificationsModule],
  controllers: [TalentPoolController],
  providers: [TalentPoolService, TalentPoolRepository],
  exports: [TalentPoolService],
})
export class TalentPoolModule {}
