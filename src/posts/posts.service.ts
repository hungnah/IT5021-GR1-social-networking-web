import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Post, PrivacyLevel } from './post.entity';
import { Reaction } from './reaction.entity';

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
  ) {}

  async create(userId: string, dto: CreatePostDto, imageUrl?: string): Promise<Post> {
    const post = this.postsRepository.create({
      userId,
      content: dto.content,
      privacyStatus: dto.privacyStatus ?? PrivacyLevel.PUBLIC,
      imageUrl: imageUrl ?? null,
    });
    return this.postsRepository.save(post);
  }

  async findById(id: string): Promise<PostWithCounts> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    const [withCounts] = await this.attachCounts([post]);
    return withCounts;
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
      .where('post.privacy_status = :pub', { pub: PrivacyLevel.PUBLIC })
      .orderBy('post.created_at', 'DESC')
      .skip(off)
      .take(lim)
      .getMany();

    const withCounts = await this.attachCounts(posts);
    return withCounts.map((row) => {
      const u = (row as PostWithCounts & { user: User }).user;
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
          id: u.id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        },
      };
    });
  }

  private async attachCounts(posts: Post[]): Promise<PostWithCounts[]> {
    if (posts.length === 0) return [];

    const ids = posts.map((p) => p.id);

    const reactionRows: { postId: string; count: number }[] =
      await this.postsRepository.query(
        `SELECT post_id AS "postId", COUNT(*)::int AS count
         FROM reactions WHERE post_id = ANY($1::uuid[]) GROUP BY post_id`,
        [ids],
      );

    const commentRows: { postId: string; count: number }[] =
      await this.postsRepository.query(
        `SELECT post_id AS "postId", COUNT(*)::int AS count
         FROM comments WHERE post_id = ANY($1::uuid[]) GROUP BY post_id`,
        [ids],
      );

    const rcMap = new Map(reactionRows.map((r) => [r.postId, r.count]));
    const ccMap = new Map(commentRows.map((c) => [c.postId, c.count]));

    return posts.map((post) => ({
      ...post,
      reactionCount: rcMap.get(post.id) ?? 0,
      commentCount: ccMap.get(post.id) ?? 0,
    }));
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
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');

    const comment = this.commentsRepository.create({ postId, userId, content });
    const saved = await this.commentsRepository.save(comment);

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
    const existing = await this.reactionsRepository.findOne({
      where: { postId, userId },
    });

    if (existing) {
      await this.reactionsRepository.remove(existing);
    } else {
      await this.reactionsRepository.save(
        this.reactionsRepository.create({ postId, userId }),
      );
    }

    const reactionCount = await this.reactionsRepository.count({ where: { postId } });
    return { liked: !existing, reactionCount };
  }

  async getReactionStatus(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean }> {
    const existing = await this.reactionsRepository.findOne({
      where: { postId, userId },
    });
    return { liked: !!existing };
  }
}
