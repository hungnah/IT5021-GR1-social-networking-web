import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

type AuthRequest = Request & { user: JwtPayload };

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  list(@Req() req: AuthRequest, @Query('limit') limitStr?: string) {
    const limit =
      limitStr !== undefined && limitStr !== ''
        ? parseInt(limitStr, 10)
        : 30;
    return this.notificationsService.findForUser(req.user.sub, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  @ApiBearerAuth()
  unreadCount(@Req() req: AuthRequest) {
    return this.notificationsService
      .getUnreadCount(req.user.sub)
      .then((count) => ({ count }));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  @ApiBearerAuth()
  async markAllRead(@Req() req: AuthRequest) {
    await this.notificationsService.markAllRead(req.user.sub);
    return { message: 'ok' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  @ApiBearerAuth()
  async markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    await this.notificationsService.markRead(req.user.sub, id);
    return { message: 'ok' };
  }
}
