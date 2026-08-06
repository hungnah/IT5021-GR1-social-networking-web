import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { OAuth2Client } from 'google-auth-library';
import { generateOtp, setOtp, verifyAndConsumeOtp } from './otp.store';

interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

// Hằng số cho thời gian sống của token
const ACCESS_TOKEN_TTL = '15m'; // Access token: 15 phút
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // Refresh token: 30 ngày

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

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
      username: dto.username ?? null,
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

  // ===== Refresh Token Strategy =====
  //
  // Cấp lại cặp token mới khi access token hết hạn (Token Rotation).
  // Mỗi lần refresh, refresh token cũ bị huỷ và token mới được cấp.
  // Nếu kẻ tấn công dùng lại token cũ → bcrypt.compare fail → ném 401.
  async refresh(dto: RefreshTokenDto) {
    const user = await this.usersService.findByIdWithRefreshToken(dto.userId);
    if (!user || !user.refreshToken || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ, vui lòng đăng nhập lại',
      );
    }

    if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
      await this.usersService.clearRefreshToken(user.id);
      throw new UnauthorizedException(
        'Refresh token đã hết hạn, vui lòng đăng nhập lại',
      );
    }

    const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshToken);
    if (!isMatch) {
      // Token không khớp: có thể bị đánh cắp → xoá luôn để bảo mật
      await this.usersService.clearRefreshToken(user.id);
      throw new UnauthorizedException(
        'Refresh token không hợp lệ, vui lòng đăng nhập lại',
      );
    }

    // Cấp cặp token mới, đồng thời ghi đè refresh token cũ trong DB
    return this.buildAuthResponse(user);
  }

  // Xoá refresh token trong DB → user phải đăng nhập lại để có session mới.
  async logout(userId: string) {
    await this.usersService.clearRefreshToken(userId);
    return { message: 'Đăng xuất thành công' };
  }

  async googleAuth(dto: GoogleAuthDto) {
    const profile = await this.fetchGoogleProfile(dto.accessToken);

    const existingByGoogleId = await this.usersService.findByGoogleId(profile.googleId);
    if (existingByGoogleId) {
      return this.buildAuthResponse(existingByGoogleId);
    }

    const existingByEmail = await this.usersService.findByEmail(profile.email);
    if (existingByEmail && !existingByEmail.googleId) {
      throw new HttpException(
        'Email đã tồn tại, vui lòng đăng nhập bằng mật khẩu',
        HttpStatus.CONFLICT,
      );
    }

    if (existingByEmail?.googleId === profile.googleId) {
      return this.buildAuthResponse(existingByEmail);
    }

    const user = await this.usersService.create({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      googleId: profile.googleId,
      password: await bcrypt.hash(`${profile.googleId}:${profile.email}`, 10),
    });

    return this.buildAuthResponse(user);
  }

  private async fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
    const oauth2 = new OAuth2Client();
    try {
      await oauth2.getTokenInfo(accessToken);
    } catch {
      throw new UnauthorizedException('Google token không hợp lệ hoặc đã hết hạn');
    }

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('Không lấy được thông tin tài khoản Google');
    }

    const info = (await res.json()) as {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    };

    if (!info.sub || !info.email) {
      throw new BadRequestException('Tài khoản Google thiếu email hoặc ID');
    }

    const firstName =
      info.given_name?.trim() ||
      info.name?.trim().split(/\s+/)[0] ||
      'User';
    const lastName =
      info.family_name?.trim() ||
      info.name?.trim().split(/\s+/).slice(1).join(' ') ||
      '';

    return {
      googleId: info.sub,
      email: this.normalizeEmail(info.email),
      firstName,
      lastName,
      avatarUrl: info.picture,
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }
    const otp = generateOtp();
    setOtp(normalizedEmail, otp);
    await this.emailService.sendOtp(normalizedEmail, otp);
    return { message: 'Mã OTP đã được gửi đến email của bạn. Hiệu lực 10 phút.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = this.normalizeEmail(dto.email);

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận không khớp');
    }
    const valid = verifyAndConsumeOtp(email, dto.otp);
    if (!valid) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('Email không tồn tại');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);

    // Huỷ refresh token cũ để chắc chắn các phiên trước đó không gây hiểu nhầm.
    await this.usersService.clearRefreshToken(user.id);

    // Verify ngay sau khi ghi DB để đảm bảo mật khẩu đã được lưu thật sự.
    const authUser = await this.usersService.findAuthByEmail(email);
    if (!authUser?.password) {
      throw new BadRequestException('Không thể xác minh trạng thái mật khẩu sau khi cập nhật');
    }
    const isPersisted = await bcrypt.compare(dto.newPassword, authUser.password);
    if (!isPersisted) {
      throw new BadRequestException('Cập nhật mật khẩu chưa được lưu trong database');
    }

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' };
  }

  // Tạo cặp (accessToken, refreshToken) và lưu HASH refresh token vào DB.
  // - accessToken: JWT 15 phút (dùng cho các request bình thường)
  // - refreshToken: UUID 30 ngày, lưu bcrypt-hash vào DB cho an toàn
  private async buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    // Tạo refresh token raw (UUID v4), client sẽ giữ bản raw này
    const refreshToken = randomUUID();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Lưu bản HASH vào DB → DB rò rỉ vẫn không lộ refresh token thật
    await this.usersService.updateRefreshToken(
      user.id,
      hashedRefreshToken,
      refreshTokenExpiresAt,
    );

    const [firstName = '', ...lastNameParts] = (user.displayName ?? '').trim().split(/\s+/);
    const lastName = lastNameParts.join(' ');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName,
        lastName,
        email: user.email,
        googleId: user.googleId,
      },
    };
  }
}
