"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.PostsService = void 0;
var common_1 = require("@nestjs/common");
var post_entity_1 = require("./post.entity");
var PostsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PostsService = _classThis = /** @class */ (function () {
        function PostsService_1(postsRepository, commentsRepository, reactionsRepository) {
            this.postsRepository = postsRepository;
            this.commentsRepository = commentsRepository;
            this.reactionsRepository = reactionsRepository;
        }
        PostsService_1.prototype.create = function (userId, dto, imageUrl) {
            return __awaiter(this, void 0, void 0, function () {
                var post;
                var _a;
                return __generator(this, function (_b) {
                    post = this.postsRepository.create({
                        userId: userId,
                        content: dto.content,
                        privacyStatus: (_a = dto.privacyStatus) !== null && _a !== void 0 ? _a : post_entity_1.PrivacyLevel.PUBLIC,
                        imageUrl: imageUrl !== null && imageUrl !== void 0 ? imageUrl : null,
                    });
                    return [2 /*return*/, this.postsRepository.save(post)];
                });
            });
        };
        PostsService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var post, withCounts;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postsRepository.findOne({ where: { id: id } })];
                        case 1:
                            post = _a.sent();
                            if (!post)
                                throw new common_1.NotFoundException('Bài viết không tồn tại');
                            return [4 /*yield*/, this.attachCounts([post])];
                        case 2:
                            withCounts = (_a.sent())[0];
                            return [2 /*return*/, withCounts];
                    }
                });
            });
        };
        PostsService_1.prototype.delete = function (id, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var post;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postsRepository.findOne({ where: { id: id } })];
                        case 1:
                            post = _a.sent();
                            if (!post)
                                throw new common_1.NotFoundException('Bài viết không tồn tại');
                            if (post.userId !== userId)
                                throw new common_1.ForbiddenException('Không có quyền xóa bài viết này');
                            return [4 /*yield*/, this.postsRepository.remove(post)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Đã xóa bài viết thành công' }];
                    }
                });
            });
        };
        PostsService_1.prototype.findByUserId = function (userId, includePrivate) {
            return __awaiter(this, void 0, void 0, function () {
                var qb, posts;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            qb = this.postsRepository
                                .createQueryBuilder('post')
                                .where('post.user_id = :userId', { userId: userId })
                                .orderBy('post.created_at', 'DESC')
                                .take(50);
                            if (!includePrivate) {
                                qb.andWhere('post.privacy_status = :pub', { pub: post_entity_1.PrivacyLevel.PUBLIC });
                            }
                            return [4 /*yield*/, qb.getMany()];
                        case 1:
                            posts = _a.sent();
                            return [2 /*return*/, this.attachCounts(posts)];
                    }
                });
            });
        };
        PostsService_1.prototype.attachCounts = function (posts) {
            return __awaiter(this, void 0, void 0, function () {
                var ids, reactionRows, commentRows, rcMap, ccMap;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (posts.length === 0)
                                return [2 /*return*/, []];
                            ids = posts.map(function (p) { return p.id; });
                            return [4 /*yield*/, this.postsRepository.query("SELECT post_id AS \"postId\", COUNT(*)::int AS count\n         FROM reactions WHERE post_id = ANY($1::uuid[]) GROUP BY post_id", [ids])];
                        case 1:
                            reactionRows = _a.sent();
                            return [4 /*yield*/, this.postsRepository.query("SELECT post_id AS \"postId\", COUNT(*)::int AS count\n         FROM comments WHERE post_id = ANY($1::uuid[]) GROUP BY post_id", [ids])];
                        case 2:
                            commentRows = _a.sent();
                            rcMap = new Map(reactionRows.map(function (r) { return [r.postId, r.count]; }));
                            ccMap = new Map(commentRows.map(function (c) { return [c.postId, c.count]; }));
                            return [2 /*return*/, posts.map(function (post) {
                                    var _a, _b;
                                    return (__assign(__assign({}, post), { reactionCount: (_a = rcMap.get(post.id)) !== null && _a !== void 0 ? _a : 0, commentCount: (_b = ccMap.get(post.id)) !== null && _b !== void 0 ? _b : 0 }));
                                })];
                    }
                });
            });
        };
        PostsService_1.prototype.getComments = function (postId) {
            return __awaiter(this, void 0, void 0, function () {
                var comments;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.commentsRepository.find({
                                where: { postId: postId },
                                relations: ['user'],
                                order: { createdAt: 'ASC' },
                            })];
                        case 1:
                            comments = _a.sent();
                            return [2 /*return*/, comments.map(function (c) { return ({
                                    id: c.id,
                                    postId: c.postId,
                                    userId: c.userId,
                                    parentId: c.parentId,
                                    content: c.content,
                                    createdAt: c.createdAt,
                                    user: {
                                        id: c.user.id,
                                        displayName: c.user.displayName,
                                        avatarUrl: c.user.avatarUrl,
                                    },
                                }); })];
                    }
                });
            });
        };
        PostsService_1.prototype.addComment = function (postId, userId, content) {
            return __awaiter(this, void 0, void 0, function () {
                var post, comment, saved, loaded;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.postsRepository.findOne({ where: { id: postId } })];
                        case 1:
                            post = _a.sent();
                            if (!post)
                                throw new common_1.NotFoundException('Bài viết không tồn tại');
                            comment = this.commentsRepository.create({ postId: postId, userId: userId, content: content });
                            return [4 /*yield*/, this.commentsRepository.save(comment)];
                        case 2:
                            saved = _a.sent();
                            return [4 /*yield*/, this.commentsRepository.findOne({
                                    where: { id: saved.id },
                                    relations: ['user'],
                                })];
                        case 3:
                            loaded = _a.sent();
                            return [2 /*return*/, {
                                    id: loaded.id,
                                    postId: loaded.postId,
                                    userId: loaded.userId,
                                    parentId: loaded.parentId,
                                    content: loaded.content,
                                    createdAt: loaded.createdAt,
                                    user: {
                                        id: loaded.user.id,
                                        displayName: loaded.user.displayName,
                                        avatarUrl: loaded.user.avatarUrl,
                                    },
                                }];
                    }
                });
            });
        };
        PostsService_1.prototype.toggleReaction = function (postId, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, reactionCount;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.reactionsRepository.findOne({
                                where: { postId: postId, userId: userId },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (!existing) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.reactionsRepository.remove(existing)];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.reactionsRepository.save(this.reactionsRepository.create({ postId: postId, userId: userId }))];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [4 /*yield*/, this.reactionsRepository.count({ where: { postId: postId } })];
                        case 6:
                            reactionCount = _a.sent();
                            return [2 /*return*/, { liked: !existing, reactionCount: reactionCount }];
                    }
                });
            });
        };
        PostsService_1.prototype.getReactionStatus = function (postId, userId) {
            return __awaiter(this, void 0, void 0, function () {
                var existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.reactionsRepository.findOne({
                                where: { postId: postId, userId: userId },
                            })];
                        case 1:
                            existing = _a.sent();
                            return [2 /*return*/, { liked: !!existing }];
                    }
                });
            });
        };
        return PostsService_1;
    }());
    __setFunctionName(_classThis, "PostsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PostsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PostsService = _classThis;
}();
exports.PostsService = PostsService;
