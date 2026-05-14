import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/sign-up.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    signUp(dto: SignUpDto): Promise<{
        accessToken: string;
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
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            googleId: string | null;
        };
    }>;
    googleAuth(dto: GoogleAuthDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            googleId: string | null;
        };
    }>;
    private buildAuthResponse;
}
