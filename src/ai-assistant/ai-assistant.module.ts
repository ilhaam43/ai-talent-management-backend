import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { GoclawService } from './goclaw.service';
import { QuotaService } from './quota.service';
import { GoclawWsGateway } from './goclaw-ws.gateway';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    GoclawService,
    QuotaService,
    GoclawWsGateway,
    PrismaService,
  ],
  exports: [AiAssistantService, GoclawService, QuotaService],
})
export class AiAssistantModule {}
