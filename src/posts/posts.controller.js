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
exports.PostsController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var multer_1 = require("multer");
var path_1 = require("path");
var fs_1 = require("fs");
var path_2 = require("path");
var jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
var post_entity_1 = require("./post.entity");
var PostsController = function () {
    var _classDecorators = [(0, common_1.Controller)('posts')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createPost_decorators;
    var _getPost_decorators;
    var _deletePost_decorators;
    var _getComments_decorators;
    var _addComment_decorators;
    var _toggleReaction_decorators;
    var _getReactionStatus_decorators;
    var PostsController = _classThis = /** @class */ (function () {
        function PostsController_1(postsService) {
            this.postsService = (__runInitializers(this, _instanceExtraInitializers), postsService);
        }
        PostsController_1.prototype.createPost = function (req, content, privacyStatus, file) {
            return __awaiter(this, void 0, void 0, function () {
                var imageUrl, privacy;
                return __generator(this, function (_a) {
                    if (!(content === null || content === void 0 ? void 0 : content.trim())) {
                        throw new common_1.BadRequestException('Nội dung không được để trống');
                    }
                    imageUrl = file
                        ? "http://localhost:3000/uploads/posts/".concat(file.filename)
                        : undefined;
                    privacy = Object.values(post_entity_1.PrivacyLevel).includes(privacyStatus)
                        ? privacyStatus
                        : post_entity_1.PrivacyLevel.PUBLIC;
                    return [2 /*return*/, this.postsService.create(req.user.sub, { content: content, privacyStatus: privacy }, imageUrl)];
                });
            });
        };
        PostsController_1.prototype.getPost = function (id) {
            return this.postsService.findById(id);
        };
        PostsController_1.prototype.deletePost = function (req, id) {
            return this.postsService.delete(id, req.user.sub);
        };
        PostsController_1.prototype.getComments = function (id) {
            return this.postsService.getComments(id);
        };
        PostsController_1.prototype.addComment = function (req, id, content) {
            if (!(content === null || content === void 0 ? void 0 : content.trim())) {
                throw new common_1.BadRequestException('Nội dung bình luận không được để trống');
            }
            return this.postsService.addComment(id, req.user.sub, content.trim());
        };
        PostsController_1.prototype.toggleReaction = function (req, id) {
            return this.postsService.toggleReaction(id, req.user.sub);
        };
        PostsController_1.prototype.getReactionStatus = function (req, id) {
            return this.postsService.getReactionStatus(id, req.user.sub);
        };
        return PostsController_1;
    }());
    __setFunctionName(_classThis, "PostsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createPost_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)(), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', {
                storage: (0, multer_1.diskStorage)({
                    destination: function (_req, _file, cb) {
                        var dir = (0, path_2.join)(process.cwd(), 'uploads', 'posts');
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
                    if (/^image\//.test(file.mimetype)) {
                        cb(null, true);
                    }
                    else {
                        cb(new common_1.BadRequestException('Chỉ chấp nhận file ảnh'), false);
                    }
                },
                limits: { fileSize: 10 * 1024 * 1024 },
            }))];
        _getPost_decorators = [(0, common_1.Get)(':id')];
        _deletePost_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Delete)(':id')];
        _getComments_decorators = [(0, common_1.Get)(':id/comments')];
        _addComment_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)(':id/comments')];
        _toggleReaction_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)(':id/reactions')];
        _getReactionStatus_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)(':id/reaction-status')];
        __esDecorate(_classThis, null, _createPost_decorators, { kind: "method", name: "createPost", static: false, private: false, access: { has: function (obj) { return "createPost" in obj; }, get: function (obj) { return obj.createPost; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPost_decorators, { kind: "method", name: "getPost", static: false, private: false, access: { has: function (obj) { return "getPost" in obj; }, get: function (obj) { return obj.getPost; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deletePost_decorators, { kind: "method", name: "deletePost", static: false, private: false, access: { has: function (obj) { return "deletePost" in obj; }, get: function (obj) { return obj.deletePost; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getComments_decorators, { kind: "method", name: "getComments", static: false, private: false, access: { has: function (obj) { return "getComments" in obj; }, get: function (obj) { return obj.getComments; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addComment_decorators, { kind: "method", name: "addComment", static: false, private: false, access: { has: function (obj) { return "addComment" in obj; }, get: function (obj) { return obj.addComment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _toggleReaction_decorators, { kind: "method", name: "toggleReaction", static: false, private: false, access: { has: function (obj) { return "toggleReaction" in obj; }, get: function (obj) { return obj.toggleReaction; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getReactionStatus_decorators, { kind: "method", name: "getReactionStatus", static: false, private: false, access: { has: function (obj) { return "getReactionStatus" in obj; }, get: function (obj) { return obj.getReactionStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PostsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PostsController = _classThis;
}();
exports.PostsController = PostsController;
