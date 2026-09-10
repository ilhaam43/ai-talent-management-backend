import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { GoclawService } from './goclaw.service';
import { QuotaService } from './quota.service';
import { LlmDashboardService } from './llm-dashboard.service';
import { GoclawWsGateway } from './goclaw-ws.gateway';
import { PrismaService } from '../database/prisma.service';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, JwtModule, EmailModule, NotificationsModule],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    GoclawService,
    QuotaService,
    LlmDashboardService,
    GoclawWsGateway,
    PrismaService,
  ],
  exports: [AiAssistantService, GoclawService, QuotaService, LlmDashboardService],
})
export class AiAssistantModule {}
