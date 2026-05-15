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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto_1 = require("crypto");
const users_service_1 = require("../users/users.service");
const email_service_1 = require("./email.service");
const otp_store_1 = require("./otp.store");
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
let AuthService = class AuthService {
    constructor(usersService, jwtService, emailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async signUp(dto) {
        const existingUser = await this.usersService.findByEmail(dto.email);
        if (existingUser) {
            throw new common_1.HttpException('Email đã được đăng ký', common_1.HttpStatus.CONFLICT);
        }
        if (dto.password !== dto.confirmPassword) {
            throw new common_1.HttpException('Password và Confirm Password không khớp', common_1.HttpStatus.BAD_REQUEST);
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
    async login(dto) {
        const user = await this.usersService.findAuthByEmail(dto.email);
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('Email hoặc Password không chính xác');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Email hoặc Password không chính xác');
        }
        return this.buildAuthResponse(user);
    }
    async refresh(dto) {
        const user = await this.usersService.findByIdWithRefreshToken(dto.userId);
        if (!user || !user.refreshToken || !user.refreshTokenExpiresAt) {
            throw new common_1.UnauthorizedException('Refresh token không hợp lệ, vui lòng đăng nhập lại');
        }
        if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
            await this.usersService.clearRefreshToken(user.id);
            throw new common_1.UnauthorizedException('Refresh token đã hết hạn, vui lòng đăng nhập lại');
        }
        const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshToken);
        if (!isMatch) {
            await this.usersService.clearRefreshToken(user.id);
            throw new common_1.UnauthorizedException('Refresh token không hợp lệ, vui lòng đăng nhập lại');
        }
        return this.buildAuthResponse(user);
    }
    async logout(userId) {
        await this.usersService.clearRefreshToken(userId);
        return { message: 'Đăng xuất thành công' };
    }
    async googleAuth(dto) {
        const existingByGoogleId = await this.usersService.findByGoogleId(dto.googleId);
        if (existingByGoogleId) {
            return this.buildAuthResponse(existingByGoogleId);
        }
        const existingByEmail = await this.usersService.findByEmail(dto.email);
        if (existingByEmail && !existingByEmail.googleId) {
            throw new common_1.HttpException('Email đã tồn tại, vui lòng đăng nhập bằng mật khẩu', common_1.HttpStatus.CONFLICT);
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
    async forgotPassword(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.NotFoundException('Email không tồn tại trong hệ thống');
        }
        const otp = (0, otp_store_1.generateOtp)();
        (0, otp_store_1.setOtp)(email, otp);
        await this.emailService.sendOtp(email, otp);
        return { message: 'Mã OTP đã được gửi đến email của bạn. Hiệu lực 10 phút.' };
    }
    async resetPassword(dto) {
        if (dto.newPassword !== dto.confirmNewPassword) {
            throw new common_1.BadRequestException('Mật khẩu mới và xác nhận không khớp');
        }
        const user = await this.usersService.findByEmail(dto.email);
        if (!user)
            throw new common_1.NotFoundException('Email không tồn tại');
        const hashed = await bcrypt.hash(dto.newPassword, 10);
        await this.usersService.updatePassword(user.id, hashed);
        return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' };
    }
    async buildAuthResponse(user) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: ACCESS_TOKEN_TTL,
        });
        const refreshToken = (0, crypto_1.randomUUID)();
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
        await this.usersService.updateRefreshToken(user.id, hashedRefreshToken, refreshTokenExpiresAt);
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map