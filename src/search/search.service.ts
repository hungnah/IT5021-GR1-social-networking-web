import { BadRequestException, Injectable } from '@nestjs/common';
import { FeedPost, PostsService } from '../posts/posts.service';
import { SearchUserHit, UsersService } from '../users/users.service';

export interface SearchResponse {
  users: SearchUserHit[];
  posts: FeedPost[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
  ) {}

  async search(
    query: string,
    currentUserId: string,
    limit = 15,
  ): Promise<SearchResponse> {
    const q = query.trim();
    if (q.length === 0) {
      return { users: [], posts: [] };
    }
    if (q.length < 2) {
      throw new BadRequestException('Nhập ít nhất 2 ký tự để tìm kiếm');
    }

    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 15), 30);
    const [users, posts] = await Promise.all([
      this.usersService.searchUsers(q, lim, currentUserId),
      this.postsService.searchPublicPosts(q, lim),
    ]);
    return { users, posts };
  }
}
