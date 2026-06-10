import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './user.entity';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  googleId?: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string;
  bio: string | null;
  gender: string | null;
  location: string | null;
  website: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  createdAt: Date;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export interface SuggestedUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  mutualCount: number;
  isFollowing: boolean;
}

export interface SearchUserHit {
  id: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findAuthByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  // Lấy user kèm cả các cột select:false (refreshToken, refreshTokenExpiresAt)
  // Dùng trong luồng verify refresh token.
  async findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .addSelect('user.refreshTokenExpiresAt')
      .where('user.id = :id', { id })
      .getOne();
  }

  async create(input: CreateUserInput): Promise<User> {
    const displayName = `${input.firstName} ${input.lastName}`.trim();
    const user = this.usersRepository.create({
      displayName,
      email: input.email,
      password: input.password,
      googleId: input.googleId ?? null,
    });
    return this.usersRepository.save(user);
  }

  async getProfile(id: string): Promise<UserProfile> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const [postsRow] = await this.usersRepository.query(
      `SELECT COUNT(*)::int AS count FROM posts WHERE user_id = $1`,
      [id],
    );
    const [followersRow] = await this.usersRepository.query(
      `SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1`,
      [id],
    );
    const [followingRow] = await this.usersRepository.query(
      `SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1`,
      [id],
    );

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      gender: user.gender,
      location: user.location,
      website: user.website,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      createdAt: user.createdAt,
      postsCount: postsRow?.count ?? 0,
      followersCount: followersRow?.count ?? 0,
      followingCount: followingRow?.count ?? 0,
    };
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const result = await this.usersRepository.update(id, {
      password: hashedPassword,
    });
    if (!result.affected) {
      throw new NotFoundException('Không tìm thấy tài khoản để cập nhật mật khẩu');
    }
  }

  // Lưu hash refresh token + thời điểm hết hạn vào DB.
  // Gọi sau khi login/refresh để áp dụng cơ chế Token Rotation.
  async updateRefreshToken(
    id: string,
    hashedRefreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      refreshToken: hashedRefreshToken,
      refreshTokenExpiresAt: expiresAt,
    });
  }

  // Xoá refresh token (logout hoặc khi phát hiện token không hợp lệ).
  async clearRefreshToken(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      refreshToken: null,
      refreshTokenExpiresAt: null,
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.coverUrl !== undefined) user.coverUrl = dto.coverUrl;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.website !== undefined) user.website = dto.website;

    await this.usersRepository.save(user);
    return this.getProfile(id);
  }

  /** Gợi ý theo dõi: user chưa follow, sắp theo số mutual follows. */
  async getSuggestions(
    currentUserId: string,
    limit = 3,
    includeFollowing = false,
  ): Promise<SuggestedUser[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 3), 50);

    let rows: {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
      mutualCount: number;
      isFollowing: boolean;
    }[] = [];

    try {
      rows = await this.usersRepository.query(
        `
        SELECT
          u.id AS id,
          u.display_name AS "displayName",
          u.avatar_url AS "avatarUrl",
          (
            SELECT COUNT(DISTINCT f1.following_id)::int
            FROM follows f1
            INNER JOIN follows f2 ON f1.following_id = f2.following_id
            WHERE f1.follower_id = $1 AND f2.follower_id = u.id
          ) AS "mutualCount",
          EXISTS (
            SELECT 1 FROM follows
            WHERE follower_id = $1 AND following_id = u.id
          ) AS "isFollowing"
        FROM users u
        WHERE u.id <> $1
          AND (
            $3::boolean = true
            OR NOT EXISTS (
              SELECT 1 FROM follows
              WHERE follower_id = $1 AND following_id = u.id
            )
          )
        ORDER BY "mutualCount" DESC, u.created_at DESC
        LIMIT $2
        `,
        [currentUserId, lim, includeFollowing],
      );
    } catch {
      return [];
    }

    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      mutualCount: Number(r.mutualCount) || 0,
      isFollowing: Boolean(r.isFollowing),
    }));
  }

  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<{ following: boolean }> {
    if (followerId === followingId) {
      throw new BadRequestException('Không thể theo dõi chính mình');
    }
    const target = await this.findById(followingId);
    if (!target) throw new NotFoundException('Người dùng không tồn tại');

    const existing: { exists: boolean }[] = await this.usersRepository.query(
      `SELECT EXISTS(
         SELECT 1 FROM follows
         WHERE follower_id = $1 AND following_id = $2
       ) AS exists`,
      [followerId, followingId],
    );

    if (existing[0]?.exists) {
      await this.usersRepository.query(
        `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId],
      );
      return { following: false };
    }

    await this.usersRepository.query(
      `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`,
      [followerId, followingId],
    );
    void this.notificationsService.create(
      followingId,
      followerId,
      NotificationType.FOLLOW,
      followerId,
    );
    return { following: true };
  }

  async getFollowStatus(
    viewerId: string,
    targetId: string,
  ): Promise<{ following: boolean }> {
    if (viewerId === targetId) return { following: false };
    try {
      const rows: { exists: boolean }[] = await this.usersRepository.query(
        `SELECT EXISTS(
           SELECT 1 FROM follows
           WHERE follower_id = $1 AND following_id = $2
         ) AS exists`,
        [viewerId, targetId],
      );
      return { following: Boolean(rows[0]?.exists) };
    } catch {
      return { following: false };
    }
  }

  async getFollowers(userId: string, limit = 30): Promise<SearchUserHit[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 30), 50);
    try {
      const rows: SearchUserHit[] = await this.usersRepository.query(
        `
        SELECT u.id, u.display_name AS "displayName", u.email, u.avatar_url AS "avatarUrl"
        FROM follows f
        INNER JOIN users u ON u.id = f.follower_id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2
        `,
        [userId, lim],
      );
      return rows;
    } catch {
      return [];
    }
  }

  async getFollowing(userId: string, limit = 30): Promise<SearchUserHit[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 30), 50);
    try {
      const rows: SearchUserHit[] = await this.usersRepository.query(
        `
        SELECT u.id, u.display_name AS "displayName", u.email, u.avatar_url AS "avatarUrl"
        FROM follows f
        INNER JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2
        `,
        [userId, lim],
      );
      return rows;
    } catch {
      return [];
    }
  }

  /** Tìm user theo tên hiển thị hoặc email (không phân biệt hoa thường). */
  async searchUsers(
    query: string,
    limit = 10,
    excludeUserId?: string,
  ): Promise<SearchUserHit[]> {
    const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 10), 30);
    const pattern = `%${query.trim()}%`;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('(user.display_name ILIKE :q OR user.email ILIKE :q)', { q: pattern })
      .orderBy('user.display_name', 'ASC')
      .take(lim);

    if (excludeUserId) {
      qb.andWhere('user.id != :excludeId', { excludeId: excludeUserId });
    }

    const users = await qb.getMany();
    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl,
    }));
  }
}
