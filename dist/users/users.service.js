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
const user_entity_1 = require("./user.entity");
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({ where: { email } });
    }
    async findAuthByEmail(email) {
        return this.usersRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
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
            avatarUrl: user.avatarUrl,
            coverUrl: user.coverUrl,
            createdAt: user.createdAt,
            postsCount: postsRow?.count ?? 0,
            followersCount: followersRow?.count ?? 0,
            followingCount: followingRow?.count ?? 0,
        };
    }
    async updatePassword(id, hashedPassword) {
        await this.usersRepository.update(id, { password: hashedPassword });
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
        await this.usersRepository.save(user);
        return this.getProfile(id);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map