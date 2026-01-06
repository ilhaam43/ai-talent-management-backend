import { Module } from '@nestjs/common';
import { ActionCenterController } from './action-center.controller';
import { ActionCenterService } from './action-center.service';
import { PrismaService } from '../database/prisma.service';

@Module({
    controllers: [ActionCenterController],
    providers: [ActionCenterService, PrismaService],
    exports: [ActionCenterService],
})
export class ActionCenterModule { }
