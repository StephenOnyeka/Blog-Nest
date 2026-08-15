import { Controller, Get, Patch, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@Request() req: any) {
    return this.notificationsService.getForUser(req.user.userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Patch('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @Patch(':id/read')
  async markOneRead(@Param('id') id: string) {
    return this.notificationsService.markOneRead(id);
  }

  @Delete(':id')
  async deleteOne(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(req.user.userId, id);
  }
}
