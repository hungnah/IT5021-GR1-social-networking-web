import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly emailService;
    constructor(usersService: UsersService, jwtService: JwtService, emailService: EmailService);
    private normalizeEmail;
    signUp(dto: SignUpDto): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            googleId: string | null;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            googleId: string | null;
        };
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            googleId: string | null;
        };
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    googleAuth(dto: GoogleAuthDto): Promise<{
        accessToken: string;
        refreshToken: `${string}-${string}-${string}-${string}-${string}`;
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            googleId: string | null;
        };
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    private buildAuthResponse;
}
