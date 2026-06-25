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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { PrivacyLevel } from './post.entity';
import { PostsService } from './posts.service';

type AuthRequest = Request & { user: JwtPayload };

const postImageUploadOptions = {
  storage: diskStorage({
    destination: (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      const dir = join(process.cwd(), 'uploads', 'posts');
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

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, postImageUploadOptions),
  )
  async createPost(
    @Req() req: AuthRequest,
    @Body('content') content: string,
    @Body('privacyStatus') privacyStatus: string,
    @Body('taggedUserIds') taggedUserIdsRaw?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!content?.trim() && (!files || files.length === 0)) {
      throw new BadRequestException('Vui lòng nhập nội dung hoặc chọn ảnh');
    }
    const imageUrls = (files ?? []).map(
      (file) => `http://localhost:3000/uploads/posts/${file.filename}`,
    );
    const imageUrl = imageUrls[0];
    const allowed = [
      PrivacyLevel.PUBLIC,
      PrivacyLevel.PRIVATE,
      PrivacyLevel.FOLLOWERS_ONLY,
    ];
    const privacy = allowed.includes(privacyStatus as PrivacyLevel)
      ? (privacyStatus as PrivacyLevel)
      : PrivacyLevel.PUBLIC;

    let taggedUserIds: string[] | undefined;
    if (taggedUserIdsRaw?.trim()) {
      try {
        const parsed = JSON.parse(taggedUserIdsRaw) as unknown;
        if (Array.isArray(parsed)) {
          taggedUserIds = parsed.filter((id): id is string => typeof id === 'string');
        }
      } catch {
        throw new BadRequestException('taggedUserIds phải là JSON array hợp lệ');
      }
    }

    return this.postsService.create(
      req.user.sub,
      {
        content: content?.trim() ?? '',
        privacyStatus: privacy,
        taggedUserIds,
      },
      imageUrl,
      imageUrls,
    );
  }

  /** Bảng tin: danh sách bài viết công khai (cần đăng nhập để gọi API). */
  @UseGuards(JwtAuthGuard)
  @Get('feed')
  getFeed(
    @Req() req: AuthRequest,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr !== undefined && limitStr !== '' ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr !== undefined && offsetStr !== '' ? parseInt(offsetStr, 10) : 0;
    if (Number.isNaN(limit) || Number.isNaN(offset)) {
      throw new BadRequestException('limit và offset phải là số hợp lệ');
    }
    return this.postsService.findPublicFeed(req.user.sub, limit, offset);
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getPost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.findByIdForViewer(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deletePost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.delete(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/comments')
  getComments(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.getCommentsForViewer(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  addComment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('content') content: string,
    @Body('parentId') parentId?: string,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }
    const normalizedParentId =
      typeof parentId === 'string' && parentId.trim() ? parentId.trim() : undefined;
    return this.postsService.addComment(
      id,
      req.user.sub,
      content.trim(),
      normalizedParentId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments/:commentId/reactions')
  toggleCommentReaction(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.toggleCommentReaction(id, commentId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/reposts')
  toggleRepost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.toggleRepost(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/repost-status')
  getRepostStatus(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postsService.getRepostStatus(id, req.user.sub);
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
