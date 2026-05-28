import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { PrivacyLevel } from './post.entity';
import { PostsService } from './posts.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'posts');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (/^image\//.test(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Chỉ chấp nhận file ảnh'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async createPost(
    @Req() req: AuthRequest,
    @Body('content') content: string,
    @Body('privacyStatus') privacyStatus: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException('Nội dung không được để trống');
    }
    const imageUrl = file
      ? `http://localhost:3000/uploads/posts/${file.filename}`
      : undefined;
    const privacy = Object.values(PrivacyLevel).includes(privacyStatus as PrivacyLevel)
      ? (privacyStatus as PrivacyLevel)
      : PrivacyLevel.PUBLIC;
    return this.postsService.create(
      req.user.sub,
      { content, privacyStatus: privacy },
      imageUrl,
    );
  }

  /** Bảng tin: danh sách bài viết công khai (cần đăng nhập để gọi API). */
  @UseGuards(JwtAuthGuard)
  @Get('feed')
  getFeed(
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr !== undefined && limitStr !== '' ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr !== undefined && offsetStr !== '' ? parseInt(offsetStr, 10) : 0;
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      throw new BadRequestException('limit và offset phải là số hợp lệ');
    }
    return this.postsService.findPublicFeed(limit, offset);
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved')
  getSavedPosts(
    @Req() req: AuthRequest,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr !== undefined && limitStr !== '' ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr !== undefined && offsetStr !== '' ? parseInt(offsetStr, 10) : 0;
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      throw new BadRequestException('limit và offset phải là số hợp lệ');
    }
    return this.postsService.findSavedPosts(req.user.sub, limit, offset);
  }

  @Get(':id')
  getPost(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.delete(id, req.user.sub);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }
    return this.postsService.addComment(id, req.user.sub, content.trim());
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reactions')
  toggleReaction(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.toggleReaction(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/reaction-status')
  getReactionStatus(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.getReactionStatus(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/saves')
  toggleSaved(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.toggleSaved(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/save-status')
  getSavedStatus(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.getSavedStatus(id, req.user.sub);
  }
}
