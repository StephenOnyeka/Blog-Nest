import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/auth-request';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for authenticated user' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getAll(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getForUser(req.user.userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread notification count object' })
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked read' })
  async markAllRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification public UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked read' })
  async markOneRead(@Param('id') id: string) {
    return this.notificationsService.markOneRead(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single notification' })
  @ApiParam({ name: 'id', description: 'Notification public UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(req.user.userId, id);
  }
}
