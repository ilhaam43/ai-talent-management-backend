import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsRepository {
  constructor(private prisma: PrismaService) {}

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
      },
    });
  }

  async createManyNotifications(
    notifications: {
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      data?: any;
    }[],
  ) {
    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async findByUserId(userId: string, options?: { skip?: number; take?: number }) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip || 0,
      take: options?.take || 50,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async findHRUserIds(): Promise<string[]> {
    const employees = await this.prisma.employee.findMany({
      where: {
        userRole: {
          roleName: { in: ['HUMAN RESOURCES', 'ADMIN'] },
        },
      },
      select: { userId: true },
    });
    return employees.map((e) => e.userId);
  }

  async findHRUserIdsExcept(excludeUserId: string): Promise<string[]> {
    const employees = await this.prisma.employee.findMany({
      where: {
        userRole: {
          roleName: { in: ['HUMAN RESOURCES', 'ADMIN'] },
        },
        userId: { not: excludeUserId },
      },
      select: { userId: true },
    });
    return employees.map((e) => e.userId);
  }
}
