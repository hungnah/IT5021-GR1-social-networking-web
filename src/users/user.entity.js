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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
var typeorm_1 = require("typeorm");
var User = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('users')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _displayName_decorators;
    var _displayName_initializers = [];
    var _displayName_extraInitializers = [];
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    var _googleId_decorators;
    var _googleId_initializers = [];
    var _googleId_extraInitializers = [];
    var _bio_decorators;
    var _bio_initializers = [];
    var _bio_extraInitializers = [];
    var _avatarUrl_decorators;
    var _avatarUrl_initializers = [];
    var _avatarUrl_extraInitializers = [];
    var _coverUrl_decorators;
    var _coverUrl_initializers = [];
    var _coverUrl_extraInitializers = [];
    var _gender_decorators;
    var _gender_initializers = [];
    var _gender_extraInitializers = [];
    var _refreshToken_decorators;
    var _refreshToken_initializers = [];
    var _refreshToken_extraInitializers = [];
    var _refreshTokenExpiresAt_decorators;
    var _refreshTokenExpiresAt_initializers = [];
    var _refreshTokenExpiresAt_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var User = _classThis = /** @class */ (function () {
        function User_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.displayName = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _displayName_initializers, void 0));
            this.email = (__runInitializers(this, _displayName_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.password = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _password_initializers, void 0));
            this.googleId = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _googleId_initializers, void 0));
            this.bio = (__runInitializers(this, _googleId_extraInitializers), __runInitializers(this, _bio_initializers, void 0));
            this.avatarUrl = (__runInitializers(this, _bio_extraInitializers), __runInitializers(this, _avatarUrl_initializers, void 0));
            this.coverUrl = (__runInitializers(this, _avatarUrl_extraInitializers), __runInitializers(this, _coverUrl_initializers, void 0));
            this.gender = (__runInitializers(this, _coverUrl_extraInitializers), __runInitializers(this, _gender_initializers, void 0));
            // Lưu HASH (bcrypt) của refresh token, không lưu plain text.
            // select: false → các query mặc định sẽ không trả về cột này.
            this.refreshToken = (__runInitializers(this, _gender_extraInitializers), __runInitializers(this, _refreshToken_initializers, void 0));
            // Thời điểm refresh token hết hạn (mặc định 30 ngày kể từ lúc cấp).
            this.refreshTokenExpiresAt = (__runInitializers(this, _refreshToken_extraInitializers), __runInitializers(this, _refreshTokenExpiresAt_initializers, void 0));
            this.createdAt = (__runInitializers(this, _refreshTokenExpiresAt_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            __runInitializers(this, _createdAt_extraInitializers);
        }
        return User_1;
    }());
    __setFunctionName(_classThis, "User");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'id' })];
        _displayName_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'display_name', length: 100, nullable: true })];
        _email_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'email', unique: true, length: 255 })];
        _password_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'password_hash', length: 255, select: false })];
        _googleId_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'google_id', nullable: true, unique: true, length: 255 })];
        _bio_decorators = [(0, typeorm_1.Column)({ type: 'text', name: 'bio', nullable: true })];
        _avatarUrl_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'avatar_url', length: 255, nullable: true })];
        _coverUrl_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'cover_url', length: 255, nullable: true })];
        _gender_decorators = [(0, typeorm_1.Column)({ type: 'varchar', name: 'gender', length: 50, nullable: true })];
        _refreshToken_decorators = [(0, typeorm_1.Column)({
                type: 'varchar',
                name: 'refresh_token',
                length: 255,
                nullable: true,
                select: false,
            })];
        _refreshTokenExpiresAt_decorators = [(0, typeorm_1.Column)({
                type: 'timestamptz',
                name: 'refresh_token_expires_at',
                nullable: true,
                select: false,
            })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _displayName_decorators, { kind: "field", name: "displayName", static: false, private: false, access: { has: function (obj) { return "displayName" in obj; }, get: function (obj) { return obj.displayName; }, set: function (obj, value) { obj.displayName = value; } }, metadata: _metadata }, _displayName_initializers, _displayName_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
        __esDecorate(null, null, _googleId_decorators, { kind: "field", name: "googleId", static: false, private: false, access: { has: function (obj) { return "googleId" in obj; }, get: function (obj) { return obj.googleId; }, set: function (obj, value) { obj.googleId = value; } }, metadata: _metadata }, _googleId_initializers, _googleId_extraInitializers);
        __esDecorate(null, null, _bio_decorators, { kind: "field", name: "bio", static: false, private: false, access: { has: function (obj) { return "bio" in obj; }, get: function (obj) { return obj.bio; }, set: function (obj, value) { obj.bio = value; } }, metadata: _metadata }, _bio_initializers, _bio_extraInitializers);
        __esDecorate(null, null, _avatarUrl_decorators, { kind: "field", name: "avatarUrl", static: false, private: false, access: { has: function (obj) { return "avatarUrl" in obj; }, get: function (obj) { return obj.avatarUrl; }, set: function (obj, value) { obj.avatarUrl = value; } }, metadata: _metadata }, _avatarUrl_initializers, _avatarUrl_extraInitializers);
        __esDecorate(null, null, _coverUrl_decorators, { kind: "field", name: "coverUrl", static: false, private: false, access: { has: function (obj) { return "coverUrl" in obj; }, get: function (obj) { return obj.coverUrl; }, set: function (obj, value) { obj.coverUrl = value; } }, metadata: _metadata }, _coverUrl_initializers, _coverUrl_extraInitializers);
        __esDecorate(null, null, _gender_decorators, { kind: "field", name: "gender", static: false, private: false, access: { has: function (obj) { return "gender" in obj; }, get: function (obj) { return obj.gender; }, set: function (obj, value) { obj.gender = value; } }, metadata: _metadata }, _gender_initializers, _gender_extraInitializers);
        __esDecorate(null, null, _refreshToken_decorators, { kind: "field", name: "refreshToken", static: false, private: false, access: { has: function (obj) { return "refreshToken" in obj; }, get: function (obj) { return obj.refreshToken; }, set: function (obj, value) { obj.refreshToken = value; } }, metadata: _metadata }, _refreshToken_initializers, _refreshToken_extraInitializers);
        __esDecorate(null, null, _refreshTokenExpiresAt_decorators, { kind: "field", name: "refreshTokenExpiresAt", static: false, private: false, access: { has: function (obj) { return "refreshTokenExpiresAt" in obj; }, get: function (obj) { return obj.refreshTokenExpiresAt; }, set: function (obj, value) { obj.refreshTokenExpiresAt = value; } }, metadata: _metadata }, _refreshTokenExpiresAt_initializers, _refreshTokenExpiresAt_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        User = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return User = _classThis;
}();
exports.User = User;
