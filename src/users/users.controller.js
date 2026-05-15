"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
exports.UsersController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var multer_1 = require("multer");
var path_1 = require("path");
var fs_1 = require("fs");
var path_2 = require("path");
var jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
var UsersController = function () {
    var _classDecorators = [(0, common_1.Controller)('users')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getMe_decorators;
    var _updateMe_decorators;
    var _uploadAvatar_decorators;
    var _getMyPosts_decorators;
    var _getUser_decorators;
    var _getUserPosts_decorators;
    var UsersController = _classThis = /** @class */ (function () {
        function UsersController_1(usersService, postsService) {
            this.usersService = (__runInitializers(this, _instanceExtraInitializers), usersService);
            this.postsService = postsService;
        }
        UsersController_1.prototype.getMe = function (req) {
            return this.usersService.getProfile(req.user.sub);
        };
        UsersController_1.prototype.updateMe = function (req, dto) {
            return this.usersService.updateProfile(req.user.sub, dto);
        };
        UsersController_1.prototype.uploadAvatar = function (req, file) {
            return __awaiter(this, void 0, void 0, function () {
                var avatarUrl;
                return __generator(this, function (_a) {
                    if (!file)
                        throw new common_1.BadRequestException('Không có file được upload');
                    avatarUrl = "http://localhost:3000/uploads/avatars/".concat(file.filename);
                    return [2 /*return*/, this.usersService.updateProfile(req.user.sub, { avatarUrl: avatarUrl })];
                });
            });
        };
        UsersController_1.prototype.getMyPosts = function (req) {
            return this.postsService.findByUserId(req.user.sub, true);
        };
        UsersController_1.prototype.getUser = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var profile;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.usersService.getProfile(id)];
                        case 1:
                            profile = _a.sent();
                            if (!profile)
                                throw new common_1.NotFoundException('Người dùng không tồn tại');
                            return [2 /*return*/, profile];
                    }
                });
            });
        };
        UsersController_1.prototype.getUserPosts = function (id) {
            return this.postsService.findByUserId(id, false);
        };
        return UsersController_1;
    }());
    __setFunctionName(_classThis, "UsersController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getMe_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('me')];
        _updateMe_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Patch)('me')];
        _uploadAvatar_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('me/avatar'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
                storage: (0, multer_1.diskStorage)({
                    destination: function (_req, _file, cb) {
                        var dir = (0, path_2.join)(process.cwd(), 'uploads', 'avatars');
                        if (!(0, fs_1.existsSync)(dir))
                            (0, fs_1.mkdirSync)(dir, { recursive: true });
                        cb(null, dir);
                    },
                    filename: function (_req, file, cb) {
                        var unique = "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2));
                        cb(null, "".concat(unique).concat((0, path_1.extname)(file.originalname)));
                    },
                }),
                fileFilter: function (_req, file, cb) {
                    if (/^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype)) {
                        cb(null, true);
                    }
                    else {
                        cb(new common_1.BadRequestException('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'), false);
                    }
                },
                limits: { fileSize: 5 * 1024 * 1024 },
            }))];
        _getMyPosts_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('me/posts')];
        _getUser_decorators = [(0, common_1.Get)(':id')];
        _getUserPosts_decorators = [(0, common_1.Get)(':id/posts')];
        __esDecorate(_classThis, null, _getMe_decorators, { kind: "method", name: "getMe", static: false, private: false, access: { has: function (obj) { return "getMe" in obj; }, get: function (obj) { return obj.getMe; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMe_decorators, { kind: "method", name: "updateMe", static: false, private: false, access: { has: function (obj) { return "updateMe" in obj; }, get: function (obj) { return obj.updateMe; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadAvatar_decorators, { kind: "method", name: "uploadAvatar", static: false, private: false, access: { has: function (obj) { return "uploadAvatar" in obj; }, get: function (obj) { return obj.uploadAvatar; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyPosts_decorators, { kind: "method", name: "getMyPosts", static: false, private: false, access: { has: function (obj) { return "getMyPosts" in obj; }, get: function (obj) { return obj.getMyPosts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getUser_decorators, { kind: "method", name: "getUser", static: false, private: false, access: { has: function (obj) { return "getUser" in obj; }, get: function (obj) { return obj.getUser; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getUserPosts_decorators, { kind: "method", name: "getUserPosts", static: false, private: false, access: { has: function (obj) { return "getUserPosts" in obj; }, get: function (obj) { return obj.getUserPosts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsersController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsersController = _classThis;
}();
exports.UsersController = UsersController;
