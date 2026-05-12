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
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { generateOtp, setOtp, verifyAndConsumeOtp } from './otp.store';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }
    const otp = generateOtp();
    setOtp(email, otp);
    await this.emailService.sendOtp(email, otp);
    return { message: 'Mã OTP đã được gửi đến email của bạn. Hiệu lực 10 phút.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận không khớp');
    }
    // TODO: bật lại khi có email thật
    // const valid = verifyAndConsumeOtp(dto.email, dto.otp);
    // if (!valid) throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('Email không tồn tại');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' };
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const [firstName = '', ...lastNameParts] = (user.displayName ?? '').trim().split(/\s+/);
    const lastName = lastNameParts.join(' ');

    return {
      accessToken,
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
