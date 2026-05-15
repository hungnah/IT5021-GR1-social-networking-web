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
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findAuthByEmail(email: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findByIdWithRefreshToken(id: string): Promise<User | null>;
    create(input: CreateUserInput): Promise<User>;
    getProfile(id: string): Promise<UserProfile>;
    updatePassword(id: string, hashedPassword: string): Promise<void>;
    updateRefreshToken(id: string, hashedRefreshToken: string, expiresAt: Date): Promise<void>;
    clearRefreshToken(id: string): Promise<void>;
    updateProfile(id: string, dto: UpdateProfileDto): Promise<UserProfile>;
}
