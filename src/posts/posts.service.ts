import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Post, PrivacyLevel } from './post.entity';
import { Reaction } from './reaction.entity';
import { SavedPost } from './saved-post.entity';

export type PostWithCounts = Post & {
  reactionCount: number;
  commentCount: number;
};

/** Bài trên bảng tin (DTO JSON, không gồm relation `user` của entity). */
export interface FeedPost {
  id: string;
  userId: string;
  content: string | null;
  imageUrl: string | null;
  privacyStatus: PrivacyLevel;
  createdAt: Date;
  reactionCount: number;
  commentCount: number;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface CommentWithUser {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(Reaction)
    private readonly reactionsRepository: Repository<Reaction>,
    @InjectRepository(SavedPost)
    private readonly savedPostsRepository: Repository<SavedPost>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreatePostDto, imageUrl?: string): Promise<PostWithCounts> {
    const post = this.postsRepository.create({
      userId,
      content: dto.content?.trim() || null,
      privacyStatus: dto.privacyStatus ?? PrivacyLevel.PUBLIC,
      imageUrl: imageUrl ?? null,
    });
    const saved = await this.postsRepository.save(post);
    const [withCounts] = await this.attachCounts([saved]);
    return withCounts;
  }

  async findById(id: string): Promise<PostWithCounts> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    const [withCounts] = await this.attachCounts([post]);
    return withCounts;
  }

  /** Chỉ chủ bài hoặc người xem được bài công khai mới truy cập được. */
  async findByIdForViewer(id: string, viewerUserId: string): Promise<PostWithCounts> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    this.assertCanViewPost(post, viewerUserId);
    const [withCounts] = await this.attachCounts([post]);
    return withCounts;
  }

  private assertCanViewPost(post: Post, viewerUserId: string): void {
    if (
      post.privacyStatus === PrivacyLevel.PRIVATE &&
      post.userId !== viewerUserId
    ) {
      throw new ForbiddenException('Bài viết này ở chế độ riêng tư');
    }
  }

  private async getPostForInteraction(postId: string, userId: string): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    if (
      post.privacyStatus === PrivacyLevel.PRIVATE &&
      post.userId !== userId
    ) {
      throw new ForbiddenException('Không thể tương tác với bài viết riêng tư');
    }
    return post;
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    if (post.userId !== userId)
      throw new ForbiddenException('Không có quyền xóa bài viết này');
    await this.postsRepository.remove(post);
    return { message: 'Đã xóa bài viết thành công' };
  }

  async findByUserId(userId: string, includePrivate: boolean): Promise<PostWithCounts[]> {
    const qb = this.postsRepository
      .createQueryBuilder('post')
      .where('post.user_id = :userId', { userId })
      .orderBy('post.created_at', 'DESC')
      .take(50);

    if (!includePrivate) {
      qb.andWhere('post.privacy_status = :pub', { pub: PrivacyLevel.PUBLIC });
    }

    const posts = await qb.getMany();
    return this.attachCounts(posts);
  }

  /**
   * Bảng tin: các bài **Public** của mọi user, mới nhất trước (phân trang limit/offset).
   */
  async findPublicFeed(limit = 20, offset = 0): Promise<FeedPost[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 20), 50);
    const off = Math.max(0, Math.floor(Number(offset)) || 0);

    const posts = await this.postsRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .where('post.privacyStatus = :pub', { pub: PrivacyLevel.PUBLIC })
      .orderBy('post.createdAt', 'DESC')
      .skip(off)
      .take(lim)
      .getMany();

    // Giữ author trước attachCounts — spread entity TypeORM có thể làm mất relation `user`.
    const authors = new Map(
      posts.map((p) => {
        const withUser = p as Post & { user?: User };
        return [p.id, withUser.user] as const;
      }),
    );

    const withCounts = await this.attachCounts(posts);
    return withCounts.map((row) => {
      const u = authors.get(row.id);
      return {
        id: row.id,
        userId: row.userId,
        content: row.content,
        imageUrl: row.imageUrl,
        privacyStatus: row.privacyStatus,
        createdAt: row.createdAt,
        reactionCount: row.reactionCount,
        commentCount: row.commentCount,
        author: {
          id: u?.id ?? row.userId,
          displayName: u?.displayName ?? null,
          avatarUrl: u?.avatarUrl ?? null,
        },
      };
    });
  }

  /** Tìm bài viết công khai theo nội dung. */
  async searchPublicPosts(query: string, limit = 15): Promise<FeedPost[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 15), 30);
    const pattern = `%${query.trim()}%`;

    const posts = await this.postsRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .where('post.privacyStatus = :pub', { pub: PrivacyLevel.PUBLIC })
      .andWhere('post.content ILIKE :q', { q: pattern })
      .orderBy('post.createdAt', 'DESC')
      .take(lim)
      .getMany();

    const authors = new Map(
      posts.map((p) => {
        const withUser = p as Post & { user?: User };
        return [p.id, withUser.user] as const;
      }),
    );

    const withCounts = await this.attachCounts(posts);
    return withCounts.map((row) => {
      const u = authors.get(row.id);
      return {
        id: row.id,
        userId: row.userId,
        content: row.content,
        imageUrl: row.imageUrl,
        privacyStatus: row.privacyStatus,
        createdAt: row.createdAt,
        reactionCount: row.reactionCount,
        commentCount: row.commentCount,
        author: {
          id: u?.id ?? row.userId,
          displayName: u?.displayName ?? null,
          avatarUrl: u?.avatarUrl ?? null,
        },
      };
    });
  }

  async findSavedPosts(userId: string, limit = 20, offset = 0): Promise<FeedPost[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 20), 50);
    const off = Math.max(0, Math.floor(Number(offset)) || 0);

    const savedRows = await this.savedPostsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: off,
      take: lim,
    });
    const postIds = savedRows.map((s) => s.postId);
    if (postIds.length === 0) return [];

    const posts = await this.postsRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .where('post.id IN (:...ids)', { ids: postIds })
      .getMany();

    const orderMap = new Map(postIds.map((id, idx) => [id, idx]));
    posts.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    const authors = new Map(
      posts.map((p) => {
        const withUser = p as Post & { user?: User };
        return [p.id, withUser.user] as const;
      }),
    );

    const withCounts = await this.attachCounts(posts);
    return withCounts.map((row) => {
      const u = authors.get(row.id);
      return {
        id: row.id,
        userId: row.userId,
        content: row.content,
        imageUrl: row.imageUrl,
        privacyStatus: row.privacyStatus,
        createdAt: row.createdAt,
        reactionCount: row.reactionCount,
        commentCount: row.commentCount,
        author: {
          id: u?.id ?? row.userId,
          displayName: u?.displayName ?? null,
          avatarUrl: u?.avatarUrl ?? null,
        },
      };
    });
  }

  private async attachCounts(posts: Post[]): Promise<PostWithCounts[]> {
    if (posts.length === 0) return [];

    const ids = posts.map((p) => p.id);
    let reactionRows: { postId: string; count: number }[] = [];
    let commentRows: { postId: string; count: number }[] = [];

    try {
      reactionRows = await this.postsRepository.query(
        `SELECT post_id AS "postId", COUNT(*)::int AS count
         FROM reactions WHERE post_id = ANY($1::uuid[]) GROUP BY post_id`,
        [ids],
      );
    } catch {
      reactionRows = [];
    }

    try {
      commentRows = await this.postsRepository.query(
        `SELECT post_id AS "postId", COUNT(*)::int AS count
         FROM comments WHERE post_id = ANY($1::uuid[]) GROUP BY post_id`,
        [ids],
      );
    } catch {
      commentRows = [];
    }

    const rcMap = new Map(reactionRows.map((r) => [r.postId, r.count]));
    const ccMap = new Map(commentRows.map((c) => [c.postId, c.count]));

    return posts.map((post) => ({
      ...post,
      reactionCount: rcMap.get(post.id) ?? 0,
      commentCount: ccMap.get(post.id) ?? 0,
    }));
  }

  async getCommentsForViewer(
    postId: string,
    viewerUserId: string,
  ): Promise<CommentWithUser[]> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    this.assertCanViewPost(post, viewerUserId);
    return this.getComments(postId);
  }

  async getComments(postId: string): Promise<CommentWithUser[]> {
    const comments = await this.commentsRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      parentId: c.parentId,
      content: c.content,
      createdAt: c.createdAt,
      user: {
        id: c.user.id,
        displayName: c.user.displayName,
        avatarUrl: c.user.avatarUrl,
      },
    }));
  }

  async addComment(postId: string, userId: string, content: string): Promise<CommentWithUser> {
    const post = await this.getPostForInteraction(postId, userId);

    const comment = this.commentsRepository.create({ postId, userId, content });
    const saved = await this.commentsRepository.save(comment);

    void this.notificationsService.create(
      post.userId,
      userId,
      NotificationType.COMMENT,
      postId,
    );

    const loaded = await this.commentsRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });

    return {
      id: loaded!.id,
      postId: loaded!.postId,
      userId: loaded!.userId,
      parentId: loaded!.parentId,
      content: loaded!.content,
      createdAt: loaded!.createdAt,
      user: {
        id: loaded!.user.id,
        displayName: loaded!.user.displayName,
        avatarUrl: loaded!.user.avatarUrl,
      },
    };
  }

  async toggleReaction(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; reactionCount: number }> {
    await this.getPostForInteraction(postId, userId);
    const existing = await this.reactionsRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.reactionsRepository.remove(existing);
    } else {
      await this.reactionsRepository.save(
        this.reactionsRepository.create({ postId, userId }),
      );
      const post = await this.postsRepository.findOne({ where: { id: postId } });
      if (post) {
        void this.notificationsService.create(
          post.userId,
          userId,
          NotificationType.LIKE,
          postId,
        );
      }
    }

    const reactionCount = await this.reactionsRepository.count({ where: { postId } });
    return { liked: !existing, reactionCount };
  }

  async getReactionStatus(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean }> {
    await this.getPostForInteraction(postId, userId);
    const existing = await this.reactionsRepository.findOne({
      where: { postId, userId },
    });
    return { liked: !!existing };
  }

  async toggleSaved(
    postId: string,
    userId: string,
  ): Promise<{ saved: boolean }> {
    await this.getPostForInteraction(postId, userId);
    const existing = await this.savedPostsRepository.findOne({
      where: { postId, userId },
    });
    if (existing) {
      await this.savedPostsRepository.remove(existing);
      return { saved: false };
    }
    await this.savedPostsRepository.save(
      this.savedPostsRepository.create({ postId, userId }),
    );
    return { saved: true };
  }

  async getSavedStatus(
    postId: string,
    userId: string,
  ): Promise<{ saved: boolean }> {
    await this.getPostForInteraction(postId, userId);
    const existing = await this.savedPostsRepository.findOne({
      where: { postId, userId },
    });
    return { saved: !!existing };
  }
}
