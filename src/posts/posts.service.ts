import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { extractMentionHandles, toMentionHandle } from '../common/mention.util';
import { User } from '../users/user.entity';
import { Comment } from './comment.entity';
import { CommentReaction } from './comment-reaction.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { Post, PrivacyLevel } from './post.entity';
import { PostTag } from './post-tag.entity';
import { Reaction } from './reaction.entity';
import { SavedPost } from './saved-post.entity';

export type PostWithCounts = Post & {
  reactionCount: number;
  commentCount: number;
};

export interface TaggedUserSummary {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

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
  likedByMe: boolean;
  savedByMe: boolean;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  taggedUsers: TaggedUserSummary[];
}

export interface CommentWithUser {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
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
    @InjectRepository(CommentReaction)
    private readonly commentReactionsRepository: Repository<CommentReaction>,
    @InjectRepository(Reaction)
    private readonly reactionsRepository: Repository<Reaction>,
    @InjectRepository(SavedPost)
    private readonly savedPostsRepository: Repository<SavedPost>,
    @InjectRepository(PostTag)
    private readonly postTagsRepository: Repository<PostTag>,
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
    if (dto.taggedUserIds?.length) {
      await this.applyPostTags(saved.id, userId, dto.taggedUserIds);
    }
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
  async findByIdForViewer(id: string, viewerUserId: string): Promise<FeedPost> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    await this.assertCanViewPost(post, viewerUserId);
    const [withCounts] = await this.attachCounts([post]);
    const withUser = post as Post & { user?: User };
    const tagMap = await this.attachTaggedUsers([id]);
    const statusMap = await this.attachViewerStatus([id], viewerUserId);
    const status = statusMap.get(id);
    return this.toFeedPost(withCounts, withUser.user, tagMap.get(id) ?? [], status);
  }

  private async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const rows: Array<{ exists: boolean }> = await this.postsRepository.query(
        `SELECT EXISTS(
           SELECT 1 FROM follows
           WHERE follower_id = $1 AND following_id = $2
         ) AS exists`,
        [followerId, followingId],
      );
      return Boolean(rows[0]?.exists);
    } catch {
      return false;
    }
  }

  private async assertCanViewPost(post: Post, viewerUserId: string): Promise<void> {
    if (post.userId === viewerUserId) return;

    if (post.privacyStatus === PrivacyLevel.PRIVATE) {
      const tagged = await this.postTagsRepository.findOne({
        where: { postId: post.id, userId: viewerUserId },
      });
      if (tagged) return;
      throw new ForbiddenException('Bài viết này ở chế độ riêng tư');
    }

    if (post.privacyStatus === PrivacyLevel.FOLLOWERS_ONLY) {
      const following = await this.isFollowing(viewerUserId, post.userId);
      if (!following) {
        throw new ForbiddenException('Bài viết chỉ dành cho người theo dõi');
      }
    }
  }

  private async getPostForInteraction(postId: string, userId: string): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    await this.assertCanViewPost(post, userId);
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
      .where('post.userId = :userId', { userId })
      .orderBy('post.createdAt', 'DESC')
      .take(50);

    if (!includePrivate) {
      qb.andWhere('post.privacyStatus = :pub', { pub: PrivacyLevel.PUBLIC });
    }

    const posts = await qb.getMany();
    return this.attachCounts(posts);
  }

  /** Bài viết gắn thẻ user (tab Tagged trên profile). */
  async findTaggedPostsForUser(
    profileUserId: string,
    viewerUserId: string,
  ): Promise<PostWithCounts[]> {
    let tagRows: Array<{ post_id: string }> = [];
    try {
      tagRows = await this.postTagsRepository.query(
        `SELECT post_id FROM post_tags WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [profileUserId],
      );
    } catch {
      return [];
    }

    const postIds = tagRows.map((r) => r.post_id);
    if (postIds.length === 0) return [];

    const posts = await this.postsRepository.find({
      where: { id: In(postIds) },
    });
    const orderMap = new Map(postIds.map((id, idx) => [id, idx]));
    posts.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    const visible: Post[] = [];
    for (const post of posts) {
      if (profileUserId === viewerUserId) {
        visible.push(post);
        continue;
      }
      if (post.privacyStatus === PrivacyLevel.PUBLIC) {
        visible.push(post);
      }
    }

    return this.attachCounts(visible);
  }

  private async applyPostTags(
    postId: string,
    taggedByUserId: string,
    rawUserIds: string[],
  ): Promise<void> {
    const uniqueIds = [
      ...new Set(
        rawUserIds.filter((id) => id && id !== taggedByUserId),
      ),
    ];
    if (uniqueIds.length === 0) return;

    const existingUsers = await this.postsRepository.query(
      `SELECT id FROM users WHERE id = ANY($1::uuid[])`,
      [uniqueIds],
    );
    const validIds = new Set(
      (existingUsers as Array<{ id: string }>).map((u) => u.id),
    );
    const toTag = uniqueIds.filter((id) => validIds.has(id));
    if (toTag.length === 0) return;

    const rows = toTag.map((userId) =>
      this.postTagsRepository.create({
        postId,
        userId,
        taggedByUserId,
      }),
    );
    await this.postTagsRepository.save(rows);

    for (const userId of toTag) {
      void this.notificationsService.create(
        userId,
        taggedByUserId,
        NotificationType.TAG,
        postId,
      );
    }
  }

  async findPrivateByUserId(userId: string): Promise<PostWithCounts[]> {
    const posts = await this.postsRepository.find({
      where: { userId, privacyStatus: PrivacyLevel.PRIVATE },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return this.attachCounts(posts);
  }

  /**
   * Bảng tin: bài Public + bài Followers only từ người mà viewer đang theo dõi.
   */
  async findPublicFeed(
    viewerUserId: string,
    limit = 20,
    offset = 0,
  ): Promise<FeedPost[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 20), 50);
    const off = Math.max(0, Math.floor(Number(offset)) || 0);

    const posts = await this.postsRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .where(
        `post.privacyStatus = :pub OR (
          post.privacyStatus = :followers AND EXISTS (
            SELECT 1 FROM follows f
            WHERE f.follower_id = :viewerId AND f.following_id = post.user_id
          )
        )`,
        {
          pub: PrivacyLevel.PUBLIC,
          followers: PrivacyLevel.FOLLOWERS_ONLY,
          viewerId: viewerUserId,
        },
      )
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
    const tagMap = await this.attachTaggedUsers(withCounts.map((p) => p.id));
    const statusMap = await this.attachViewerStatus(
      withCounts.map((p) => p.id),
      viewerUserId,
    );
    return withCounts.map((row) => {
      const u = authors.get(row.id);
      return this.toFeedPost(row, u, tagMap.get(row.id) ?? [], statusMap.get(row.id));
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
    const tagMap = await this.attachTaggedUsers(withCounts.map((p) => p.id));
    return withCounts.map((row) => {
      const u = authors.get(row.id);
      return this.toFeedPost(row, u, tagMap.get(row.id) ?? []);
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
    const tagMap = await this.attachTaggedUsers(withCounts.map((p) => p.id));
    return withCounts.map((row) => {
      const u = authors.get(row.id);
      return this.toFeedPost(row, u, tagMap.get(row.id) ?? []);
    });
  }

  private async attachViewerStatus(
    postIds: string[],
    viewerUserId: string,
  ): Promise<Map<string, { likedByMe: boolean; savedByMe: boolean }>> {
    const map = new Map<string, { likedByMe: boolean; savedByMe: boolean }>();
    for (const id of postIds) {
      map.set(id, { likedByMe: false, savedByMe: false });
    }
    if (postIds.length === 0) return map;

    try {
      const likedRows = await this.reactionsRepository.find({
        where: { userId: viewerUserId, postId: In(postIds) },
        select: ['postId'],
      });
      for (const row of likedRows) {
        const cur = map.get(row.postId);
        if (cur) map.set(row.postId, { ...cur, likedByMe: true });
      }
    } catch {
      /* ignore */
    }

    try {
      const savedRows = await this.savedPostsRepository.find({
        where: { userId: viewerUserId, postId: In(postIds) },
        select: ['postId'],
      });
      for (const row of savedRows) {
        const cur = map.get(row.postId);
        if (cur) map.set(row.postId, { ...cur, savedByMe: true });
      }
    } catch {
      /* ignore */
    }

    return map;
  }

  private toFeedPost(
    row: PostWithCounts,
    user: User | undefined,
    taggedUsers: TaggedUserSummary[],
    viewerStatus?: { likedByMe: boolean; savedByMe: boolean },
  ): FeedPost {
    return {
      id: row.id,
      userId: row.userId,
      content: row.content,
      imageUrl: row.imageUrl,
      privacyStatus: row.privacyStatus,
      createdAt: row.createdAt,
      reactionCount: row.reactionCount,
      commentCount: row.commentCount,
      likedByMe: viewerStatus?.likedByMe ?? false,
      savedByMe: viewerStatus?.savedByMe ?? false,
      author: {
        id: user?.id ?? row.userId,
        displayName: user?.displayName ?? null,
        avatarUrl: user?.avatarUrl ?? null,
      },
      taggedUsers,
    };
  }

  private async attachTaggedUsers(
    postIds: string[],
  ): Promise<Map<string, TaggedUserSummary[]>> {
    const map = new Map<string, TaggedUserSummary[]>();
    if (postIds.length === 0) return map;

    let rows: Array<{
      postId: string;
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
    }> = [];

    try {
      rows = await this.postTagsRepository.query(
        `SELECT pt.post_id AS "postId",
                u.id,
                u.display_name AS "displayName",
                u.avatar_url AS "avatarUrl"
         FROM post_tags pt
         INNER JOIN users u ON u.id = pt.user_id
         WHERE pt.post_id = ANY($1::uuid[])
         ORDER BY pt.created_at ASC`,
        [postIds],
      );
    } catch {
      return map;
    }

    for (const row of rows) {
      const list = map.get(row.postId) ?? [];
      list.push({
        id: row.id,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      });
      map.set(row.postId, list);
    }
    return map;
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
    await this.assertCanViewPost(post, viewerUserId);
    return this.getComments(postId, viewerUserId);
  }

  async getComments(
    postId: string,
    viewerUserId?: string,
  ): Promise<CommentWithUser[]> {
    const comments = await this.commentsRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const likeMap = await this.attachCommentLikes(
      comments.map((c) => c.id),
      viewerUserId,
    );

    return comments.map((c) => {
      const likes = likeMap.get(c.id) ?? { likeCount: 0, likedByMe: false };
      return {
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        parentId: c.parentId,
        content: c.content,
        createdAt: c.createdAt,
        likeCount: likes.likeCount,
        likedByMe: likes.likedByMe,
        user: {
          id: c.user.id,
          displayName: c.user.displayName,
          avatarUrl: c.user.avatarUrl,
        },
      };
    });
  }

  private async attachCommentLikes(
    commentIds: string[],
    viewerUserId?: string,
  ): Promise<Map<string, { likeCount: number; likedByMe: boolean }>> {
    const map = new Map<string, { likeCount: number; likedByMe: boolean }>();
    for (const id of commentIds) {
      map.set(id, { likeCount: 0, likedByMe: false });
    }
    if (commentIds.length === 0) return map;

    try {
      const countRows: Array<{ commentId: string; count: number }> =
        await this.commentReactionsRepository.query(
          `SELECT comment_id AS "commentId", COUNT(*)::int AS count
           FROM comment_reactions WHERE comment_id = ANY($1::uuid[])
           GROUP BY comment_id`,
          [commentIds],
        );
      for (const row of countRows) {
        const cur = map.get(row.commentId);
        if (cur) map.set(row.commentId, { ...cur, likeCount: row.count });
      }
    } catch {
      /* ignore */
    }

    if (viewerUserId) {
      try {
        const mine = await this.commentReactionsRepository.find({
          where: { userId: viewerUserId, commentId: In(commentIds) },
          select: ['commentId'],
        });
        for (const row of mine) {
          const cur = map.get(row.commentId);
          if (cur) map.set(row.commentId, { ...cur, likedByMe: true });
        }
      } catch {
        /* ignore */
      }
    }

    return map;
  }

  async addComment(
    postId: string,
    userId: string,
    content: string,
    parentId?: string | null,
  ): Promise<CommentWithUser> {
    const post = await this.getPostForInteraction(postId, userId);

    let parentComment: Comment | null = null;
    if (parentId) {
      parentComment = await this.commentsRepository.findOne({
        where: { id: parentId, postId },
      });
      if (!parentComment) {
        throw new BadRequestException('Bình luận gốc không tồn tại');
      }
    }

    const comment = this.commentsRepository.create({
      postId,
      userId,
      content,
      parentId: parentId ?? null,
    });
    const saved = await this.commentsRepository.save(comment);

    const notified = new Set<string>([userId]);
    const notifyComment = (recipientId: string) => {
      if (notified.has(recipientId)) return;
      notified.add(recipientId);
      void this.notificationsService.create(
        recipientId,
        userId,
        NotificationType.COMMENT,
        postId,
      );
    };

    const primaryNotifyId = parentComment ? parentComment.userId : post.userId;
    notifyComment(primaryNotifyId);

    const mentionHandles = extractMentionHandles(content);
    if (mentionHandles.length > 0) {
      const postComments = await this.commentsRepository.find({
        where: { postId },
        relations: ['user'],
      });
      const postAuthor = await this.postsRepository.findOne({
        where: { id: postId },
        relations: ['user'],
      });

      const candidates = new Map<string, User>();
      if (postAuthor?.user) candidates.set(postAuthor.user.id, postAuthor.user);
      for (const row of postComments) {
        if (row.user) candidates.set(row.user.id, row.user);
      }

      for (const candidate of candidates.values()) {
        const handle = toMentionHandle(candidate.displayName, candidate.id);
        if (mentionHandles.includes(handle)) {
          notifyComment(candidate.id);
        }
      }
    }

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
      likeCount: 0,
      likedByMe: false,
      user: {
        id: loaded!.user.id,
        displayName: loaded!.user.displayName,
        avatarUrl: loaded!.user.avatarUrl,
      },
    };
  }

  async toggleCommentReaction(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    await this.getPostForInteraction(postId, userId);

    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, postId },
    });
    if (!comment) throw new NotFoundException('Bình luận không tồn tại');

    const existing = await this.commentReactionsRepository.findOne({
      where: { commentId, userId },
    });

    if (existing) {
      await this.commentReactionsRepository.remove(existing);
    } else {
      await this.commentReactionsRepository.save(
        this.commentReactionsRepository.create({ commentId, userId }),
      );
    }

    const likeCount = await this.commentReactionsRepository.count({
      where: { commentId },
    });
    return { liked: !existing, likeCount };
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
