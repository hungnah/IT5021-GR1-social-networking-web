import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
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
  @Get('me/posts')
  getMyPosts(@Req() req: AuthRequest) {
    return this.postsService.findByUserId(req.user.sub, true);
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
