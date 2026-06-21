import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesService } from './messages.service';

type AuthRequest = Request & { user: JwtPayload };

const messageImageUploadOptions = {
  storage: diskStorage({
    destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      const dir = join(process.cwd(), 'uploads', 'messages');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (/^image\//.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Chỉ chấp nhận file ảnh'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
};

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
  @Post('upload-image')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('image', messageImageUploadOptions))
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh');
    }
    return {
      imageUrl: `http://localhost:3000/uploads/messages/${file.filename}`,
    };
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
