import { Repository } from 'typeorm';
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
export declare class UsersService {
    private readonly usersRepository;
    private readonly notificationsService;
    constructor(usersRepository: Repository<User>, notificationsService: NotificationsService);
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
    getSuggestions(currentUserId: string, limit?: number, includeFollowing?: boolean): Promise<SuggestedUser[]>;
    toggleFollow(followerId: string, followingId: string): Promise<{
        following: boolean;
    }>;
    getFollowStatus(viewerId: string, targetId: string): Promise<{
        following: boolean;
    }>;
    getFollowers(userId: string, limit?: number): Promise<SearchUserHit[]>;
    getFollowing(userId: string, limit?: number): Promise<SearchUserHit[]>;
    searchUsers(query: string, limit?: number, excludeUserId?: string): Promise<SearchUserHit[]>;
}
