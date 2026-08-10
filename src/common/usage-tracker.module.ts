import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsageTrackerService } from './usage-tracker.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [UsageTrackerService],
  exports: [UsageTrackerService],
})
export class UsageTrackerModule {}
