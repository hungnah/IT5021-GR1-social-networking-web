"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
var common_1 = require("@nestjs/common");
var UsersService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var UsersService = _classThis = /** @class */ (function () {
        function UsersService_1(usersRepository) {
            this.usersRepository = usersRepository;
        }
        UsersService_1.prototype.findByEmail = function (email) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.usersRepository.findOne({ where: { email: email } })];
                });
            });
        };
        UsersService_1.prototype.findAuthByEmail = function (email) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.usersRepository
                            .createQueryBuilder('user')
                            .addSelect('user.password')
                            .where('user.email = :email', { email: email })
                            .getOne()];
                });
            });
        };
        UsersService_1.prototype.findByGoogleId = function (googleId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.usersRepository.findOne({ where: { googleId: googleId } })];
                });
            });
        };
        UsersService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.usersRepository.findOne({ where: { id: id } })];
                });
            });
        };
        // Lấy user kèm cả các cột select:false (refreshToken, refreshTokenExpiresAt)
        // Dùng trong luồng verify refresh token.
        UsersService_1.prototype.findByIdWithRefreshToken = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.usersRepository
                            .createQueryBuilder('user')
                            .addSelect('user.refreshToken')
                            .addSelect('user.refreshTokenExpiresAt')
                            .where('user.id = :id', { id: id })
                            .getOne()];
                });
            });
        };
        UsersService_1.prototype.create = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var displayName, user;
                var _a;
                return __generator(this, function (_b) {
                    displayName = "".concat(input.firstName, " ").concat(input.lastName).trim();
                    user = this.usersRepository.create({
                        displayName: displayName,
                        email: input.email,
                        password: input.password,
                        googleId: (_a = input.googleId) !== null && _a !== void 0 ? _a : null,
                    });
                    return [2 /*return*/, this.usersRepository.save(user)];
                });
            });
        };
        UsersService_1.prototype.getProfile = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var user, postsRow, followersRow, followingRow;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.usersRepository.findOne({ where: { id: id } })];
                        case 1:
                            user = _d.sent();
                            if (!user)
                                throw new common_1.NotFoundException('Người dùng không tồn tại');
                            return [4 /*yield*/, this.usersRepository.query("SELECT COUNT(*)::int AS count FROM posts WHERE user_id = $1", [id])];
                        case 2:
                            postsRow = (_d.sent())[0];
                            return [4 /*yield*/, this.usersRepository.query("SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1", [id])];
                        case 3:
                            followersRow = (_d.sent())[0];
                            return [4 /*yield*/, this.usersRepository.query("SELECT COUNT(*)::int AS count FROM follows WHERE follower_id = $1", [id])];
                        case 4:
                            followingRow = (_d.sent())[0];
                            return [2 /*return*/, {
                                    id: user.id,
                                    displayName: user.displayName,
                                    email: user.email,
                                    bio: user.bio,
                                    gender: user.gender,
                                    avatarUrl: user.avatarUrl,
                                    coverUrl: user.coverUrl,
                                    createdAt: user.createdAt,
                                    postsCount: (_a = postsRow === null || postsRow === void 0 ? void 0 : postsRow.count) !== null && _a !== void 0 ? _a : 0,
                                    followersCount: (_b = followersRow === null || followersRow === void 0 ? void 0 : followersRow.count) !== null && _b !== void 0 ? _b : 0,
                                    followingCount: (_c = followingRow === null || followingRow === void 0 ? void 0 : followingRow.count) !== null && _c !== void 0 ? _c : 0,
                                }];
                    }
                });
            });
        };
        UsersService_1.prototype.updatePassword = function (id, hashedPassword) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.usersRepository.update(id, { password: hashedPassword })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Lưu hash refresh token + thời điểm hết hạn vào DB.
        // Gọi sau khi login/refresh để áp dụng cơ chế Token Rotation.
        UsersService_1.prototype.updateRefreshToken = function (id, hashedRefreshToken, expiresAt) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.usersRepository.update(id, {
                                refreshToken: hashedRefreshToken,
                                refreshTokenExpiresAt: expiresAt,
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // Xoá refresh token (logout hoặc khi phát hiện token không hợp lệ).
        UsersService_1.prototype.clearRefreshToken = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.usersRepository.update(id, {
                                refreshToken: null,
                                refreshTokenExpiresAt: null,
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        UsersService_1.prototype.updateProfile = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.usersRepository.findOne({ where: { id: id } })];
                        case 1:
                            user = _a.sent();
                            if (!user)
                                throw new common_1.NotFoundException('Người dùng không tồn tại');
                            if (dto.displayName !== undefined)
                                user.displayName = dto.displayName;
                            if (dto.bio !== undefined)
                                user.bio = dto.bio;
                            if (dto.avatarUrl !== undefined)
                                user.avatarUrl = dto.avatarUrl;
                            if (dto.coverUrl !== undefined)
                                user.coverUrl = dto.coverUrl;
                            if (dto.gender !== undefined)
                                user.gender = dto.gender;
                            return [4 /*yield*/, this.usersRepository.save(user)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, this.getProfile(id)];
                    }
                });
            });
        };
        return UsersService_1;
    }());
    __setFunctionName(_classThis, "UsersService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsersService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsersService = _classThis;
}();
exports.UsersService = UsersService;
