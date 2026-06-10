"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("../notifications/notification.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const user_entity_1 = require("./user.entity");
let UsersService = class UsersService {
    constructor(usersRepository, notificationsService) {
        this.usersRepository = usersRepository;
        this.notificationsService = notificationsService;
    }
    async findByEmail(email) {
        return this.usersRepository
            .createQueryBuilder('user')
            .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
            .getOne();
    }
    async findAuthByEmail(email) {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
            .getOne();
    }
    async findByGoogleId(googleId) {
        return this.usersRepository.findOne({ where: { googleId } });
    }
    async findById(id) {
        return this.usersRepository.findOne({ where: { id } });
    }
    async findByIdWithRefreshToken(id) {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.refreshToken')
            .addSelect('user.refreshTokenExpiresAt')
            .where('user.id = :id', { id })
            .getOne();
    }
    async create(input) {
        const displayName = `${input.firstName} ${input.lastName}`.trim();
        const user = this.usersRepository.create({
            displayName,
            email: input.email,
            password: input.password,
            googleId: input.googleId ?? null,
        });
        return this.usersRepository.save(user);
    }
    async getProfile(id) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Người dùng không tồn tại');
        const [postsRow] = await this.usersRepository.query(`SELECT COUNT(*)::int AS count FROM posts WHERE user_id = $1`, [id]);
        const [followersRow] = await this.usersRepository.query(`SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1`, [id]);
        const [followingRow] = await this.usersRepository.query(`SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1`, [id]);
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
    async updatePassword(id, hashedPassword) {
        const result = await this.usersRepository.update(id, {
            password: hashedPassword,
        });
        if (!result.affected) {
            throw new common_1.NotFoundException('Không tìm thấy tài khoản để cập nhật mật khẩu');
        }
    }
    async updateRefreshToken(id, hashedRefreshToken, expiresAt) {
        await this.usersRepository.update(id, {
            refreshToken: hashedRefreshToken,
            refreshTokenExpiresAt: expiresAt,
        });
    }
    async clearRefreshToken(id) {
        await this.usersRepository.update(id, {
            refreshToken: null,
            refreshTokenExpiresAt: null,
        });
    }
    async updateProfile(id, dto) {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Người dùng không tồn tại');
        if (dto.displayName !== undefined)
            user.displayName = dto.displayName;
        if (dto.bio !== undefined)
            user.bio = dto.bio;
        if (dto.avatarUrl !== undefined)
            user.avatarUrl = dto.avatarUrl;
        if (dto.coverUrl !== undefined)
            user.coverUrl = dto.coverUrl;
        if (dto.gender !== undefined)
            user.gender = dto.gender;
        if (dto.location !== undefined)
            user.location = dto.location;
        if (dto.website !== undefined)
            user.website = dto.website;
        await this.usersRepository.save(user);
        return this.getProfile(id);
    }
    async getSuggestions(currentUserId, limit = 3, includeFollowing = false) {
        const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 3), 50);
        let rows = [];
        try {
            rows = await this.usersRepository.query(`
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
        `, [currentUserId, lim, includeFollowing]);
        }
        catch {
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
    async toggleFollow(followerId, followingId) {
        if (followerId === followingId) {
            throw new common_1.BadRequestException('Không thể theo dõi chính mình');
        }
        const target = await this.findById(followingId);
        if (!target)
            throw new common_1.NotFoundException('Người dùng không tồn tại');
        const existing = await this.usersRepository.query(`SELECT EXISTS(
         SELECT 1 FROM follows
         WHERE follower_id = $1 AND following_id = $2
       ) AS exists`, [followerId, followingId]);
        if (existing[0]?.exists) {
            await this.usersRepository.query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [followerId, followingId]);
            return { following: false };
        }
        await this.usersRepository.query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`, [followerId, followingId]);
        void this.notificationsService.create(followingId, followerId, notification_entity_1.NotificationType.FOLLOW, followerId);
        return { following: true };
    }
    async getFollowStatus(viewerId, targetId) {
        if (viewerId === targetId)
            return { following: false };
        try {
            const rows = await this.usersRepository.query(`SELECT EXISTS(
           SELECT 1 FROM follows
           WHERE follower_id = $1 AND following_id = $2
         ) AS exists`, [viewerId, targetId]);
            return { following: Boolean(rows[0]?.exists) };
        }
        catch {
            return { following: false };
        }
    }
    async getFollowers(userId, limit = 30) {
        const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 30), 50);
        try {
            const rows = await this.usersRepository.query(`
        SELECT u.id, u.display_name AS "displayName", u.email, u.avatar_url AS "avatarUrl"
        FROM follows f
        INNER JOIN users u ON u.id = f.follower_id
        WHERE f.following_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2
        `, [userId, lim]);
            return rows;
        }
        catch {
            return [];
        }
    }
    async getFollowing(userId, limit = 30) {
        const lim = Math.min(Math.max(1, Math.floor(Number(limit)) || 30), 50);
        try {
            const rows = await this.usersRepository.query(`
        SELECT u.id, u.display_name AS "displayName", u.email, u.avatar_url AS "avatarUrl"
        FROM follows f
        INNER JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2
        `, [userId, lim]);
            return rows;
        }
        catch {
            return [];
        }
    }
    async searchUsers(query, limit = 10, excludeUserId) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        notifications_service_1.NotificationsService])
], UsersService);
//# sourceMappingURL=users.service.js.map