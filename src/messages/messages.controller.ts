import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

type AuthRequest = Request & { user: JwtPayload };

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  @ApiBearerAuth()
  conversations(@Req() req: AuthRequest) {
    return this.messagesService.getConversations(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  @ApiBearerAuth()
  unreadCount(@Req() req: AuthRequest) {
    return this.messagesService
      .getUnreadCount(req.user.sub)
      .then((count) => ({ count }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('partner/:userId')
  @ApiBearerAuth()
  partner(@Req() req: AuthRequest, @Param('userId') userId: string) {
    return this.messagesService.getPartner(req.user.sub, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('with/:userId')
  @ApiBearerAuth()
  thread(
    @Req() req: AuthRequest,
    @Param('userId') userId: string,
    @Query('limit') limitStr?: string,
    @Query('before') before?: string,
  ) {
    const limit =
      limitStr !== undefined && limitStr !== ''
        ? parseInt(limitStr, 10)
        : 50;
    return this.messagesService.getThread(req.user.sub, userId, limit, before);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  send(@Req() req: AuthRequest, @Body() dto: CreateMessageDto) {
    return this.messagesService.send(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('with/:userId/read')
  @ApiBearerAuth()
  async markRead(@Req() req: AuthRequest, @Param('userId') userId: string) {
    await this.messagesService.markThreadRead(req.user.sub, userId);
    return { message: 'ok' };
  }
}
