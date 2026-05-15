import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAuthByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
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
    await this.usersRepository.update(id, { password: hashedPassword });
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
}
