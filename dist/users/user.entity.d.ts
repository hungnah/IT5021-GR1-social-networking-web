export declare class User {
    id: string;
    displayName: string | null;
    email: string;
    password: string;
    googleId: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    gender: string | null;
    location: string | null;
    website: string | null;
    refreshToken: string | null;
    refreshTokenExpiresAt: Date | null;
    createdAt: Date;
}
