import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Comment } from '../posts/comment.entity';
import { Post } from '../posts/post.entity';
import { Notification, NotificationType } from './notification.entity';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  postImageUrl: string | null;
  postAuthorName: string | null;
  commentSnippet: string | null;
  commentIsReply: boolean;
  viewerFollowsActor: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
  ) {}

  async create(
    recipientId: string,
    actorId: string,
    type: NotificationType,
    entityId: string | null = null,
  ): Promise<void> {
    if (recipientId === actorId) return;

    try {
      const row = this.notificationsRepository.create({
        recipientId,
        actorId,
        type,
        entityId,
        isRead: false,
      });
      await this.notificationsRepository.save(row);
    } catch {
      /* bảng chưa có hoặc FK lỗi — bỏ qua để không chặn luồng chính */
    }
  }

  async findForUser(recipientId: string, limit = 30): Promise<NotificationItem[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 30), 50);

    try {
      const rows = await this.notificationsRepository.find({
        where: { recipientId },
        relations: ['actor'],
        order: { createdAt: 'DESC' },
        take: lim,
      });

      if (rows.length === 0) return [];

      const postIds = [
        ...new Set(
          rows
            .filter(
              (n) =>
                n.entityId &&
                (n.type === NotificationType.LIKE ||
                  n.type === NotificationType.COMMENT ||
                  n.type === NotificationType.TAG),
            )
            .map((n) => n.entityId as string),
        ),
      ];

      const actorIds = [...new Set(rows.map((n) => n.actor.id))];

      const posts =
        postIds.length > 0
          ? await this.postsRepository.find({
              where: { id: In(postIds) },
              relations: ['user'],
            })
          : [];
      const postMap = new Map(posts.map((p) => [p.id, p]));

      const followRows: Array<{ id: string }> =
        actorIds.length > 0
          ? await this.notificationsRepository.manager.query(
              `SELECT following_id AS id FROM follows
               WHERE follower_id = $1 AND following_id = ANY($2::uuid[])`,
              [recipientId, actorIds],
            )
          : [];
      const followingSet = new Set(followRows.map((r) => r.id));

      const enriched = await Promise.all(
        rows.map(async (n) => {
          let postImageUrl: string | null = null;
          let postAuthorName: string | null = null;
          let commentSnippet: string | null = null;
          let commentIsReply = false;

          if (n.entityId && postMap.has(n.entityId)) {
            const post = postMap.get(n.entityId)!;
            postImageUrl = post.imageUrl;
            postAuthorName = post.user?.displayName ?? null;
          }

          if (n.type === NotificationType.COMMENT && n.entityId) {
            const comment = await this.commentsRepository.findOne({
              where: { postId: n.entityId, userId: n.actor.id },
              order: { createdAt: 'DESC' },
            });
            if (comment) {
              commentSnippet = comment.content;
              commentIsReply = !!comment.parentId;
            }
          }

          return {
            id: n.id,
            type: n.type,
            entityId: n.entityId,
            isRead: n.isRead,
            createdAt: n.createdAt,
            actor: {
              id: n.actor.id,
              username: n.actor.username,
              displayName: n.actor.displayName,
              avatarUrl: n.actor.avatarUrl,
            },
            postImageUrl,
            postAuthorName,
            commentSnippet,
            commentIsReply,
            viewerFollowsActor: followingSet.has(n.actor.id),
          };
        }),
      );

      return enriched;
    } catch {
      return [];
    }
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    try {
      return await this.notificationsRepository.count({
        where: { recipientId, isRead: false },
      });
    } catch {
      return 0;
    }
  }

  async markRead(recipientId: string, notificationId: string): Promise<void> {
    const row = await this.notificationsRepository.findOne({
      where: { id: notificationId, recipientId },
    });
    if (!row) throw new NotFoundException('Thông báo không tồn tại');
    row.isRead = true;
    await this.notificationsRepository.save(row);
  }

  async markAllRead(recipientId: string): Promise<void> {
    try {
      await this.notificationsRepository.update(
        { recipientId, isRead: false },
        { isRead: true },
      );
    } catch {
      /* ignore */
    }
  }
}
