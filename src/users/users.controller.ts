import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { PostsService } from '../posts/posts.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthRequest) {
    return this.usersService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'avatars');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không có file được upload');
    const avatarUrl = `http://localhost:3000/uploads/avatars/${file.filename}`;
    return this.usersService.updateProfile(req.user.sub, { avatarUrl });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/posts')
  getMyPosts(@Req() req: AuthRequest) {
    return this.postsService.findByUserId(req.user.sub, true);
  }

  @UseGuards(JwtAuthGuard)
  @Get('suggestions')
  getSuggestions(
    @Req() req: AuthRequest,
    @Query('limit') limitStr?: string,
    @Query('all') all?: string,
  ) {
    const limit =
      limitStr !== undefined && limitStr !== ''
        ? parseInt(limitStr, 10)
        : all === 'true' || all === '1'
          ? 50
          : 3;
    if (Number.isNaN(limit)) {
      throw new BadRequestException('limit phải là số hợp lệ');
    }
    const includeFollowing = all === 'true' || all === '1';
    return this.usersService.getSuggestions(
      req.user.sub,
      limit,
      includeFollowing,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  toggleFollow(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.usersService.toggleFollow(req.user.sub, id);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const profile = await this.usersService.getProfile(id);
    if (!profile) throw new NotFoundException('Người dùng không tồn tại');
    return profile;
  }

  @Get(':id/posts')
  getUserPosts(@Param('id') id: string) {
    return this.postsService.findByUserId(id, false);
  }
}
