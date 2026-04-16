import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new HttpException('Email đã được đăng ký', HttpStatus.CONFLICT);
    }

    if (dto.password !== dto.confirmPassword) {
      throw new HttpException(
        'Password và Confirm Password không khớp',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findAuthByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Email hoặc Password không chính xác');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc Password không chính xác');
    }

    return this.buildAuthResponse(user);
  }

  async googleAuth(dto: GoogleAuthDto) {
    const existingByGoogleId = await this.usersService.findByGoogleId(dto.googleId);
    if (existingByGoogleId) {
      return this.buildAuthResponse(existingByGoogleId);
    }

    const existingByEmail = await this.usersService.findByEmail(dto.email);
    if (existingByEmail && !existingByEmail.googleId) {
      throw new HttpException(
        'Email đã tồn tại, vui lòng đăng nhập bằng mật khẩu',
        HttpStatus.CONFLICT,
      );
    }

    if (existingByEmail?.googleId === dto.googleId) {
      return this.buildAuthResponse(existingByEmail);
    }

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      googleId: dto.googleId,
      password: await bcrypt.hash(`${dto.googleId}:${dto.email}`, 10),
    });

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        googleId: user.googleId,
      },
    };
  }
}
