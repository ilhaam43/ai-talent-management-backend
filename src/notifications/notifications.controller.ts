import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications for the logged-in user' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip (offset)', example: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Number of records to return (limit)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of notifications with total count.',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            userId: 'uuid',
            type: 'APPLICANT_QUALIFIED',
            title: 'New Qualified Applicant',
            message: 'John Doe has applied for Software Engineer and is qualified.',
            isRead: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        skip: 0,
        take: 50,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – JWT token missing or invalid.' })
  async getMyNotifications(
    @Request() req: any,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.service.getMyNotifications(
      req.user.userId,
      skip,
      take,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the count of unread notifications for the logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'Returns the number of unread notifications.',
    schema: { example: { count: 5 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – JWT token missing or invalid.' })
  async getUnreadCount(@Request() req: any) {
    return this.service.getUnreadCount(req.user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiParam({ name: 'id', description: 'UUID of the notification to mark as read', type: String })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully.',
    schema: {
      example: {
        id: 'uuid',
        isRead: true,
        title: 'New Qualified Applicant',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – JWT token missing or invalid.' })
  @ApiResponse({ status: 404, description: 'Notification not found or does not belong to this user.' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.markAsRead(id, req.user.userId);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for the logged-in user' })
  @ApiResponse({
    status: 201,
    description: 'All notifications marked as read. Returns the count of updated records.',
    schema: { example: { count: 12 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – JWT token missing or invalid.' })
  async markAllAsRead(@Request() req: any) {
    return this.service.markAllAsRead(req.user.userId);
  }
}
