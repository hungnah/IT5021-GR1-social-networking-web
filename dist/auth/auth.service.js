"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    usersService;
    jwtService;
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
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
    buildAuthResponse(user) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map