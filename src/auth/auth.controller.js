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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var refresh_token_dto_1 = require("./dto/refresh-token.dto");
var jwt_auth_guard_1 = require("./jwt-auth.guard");
var AuthController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('Auth'), (0, common_1.Controller)('auth')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _signUp_decorators;
    var _login_decorators;
    var _google_decorators;
    var _forgotPassword_decorators;
    var _resetPassword_decorators;
    var _refresh_decorators;
    var _logout_decorators;
    var AuthController = _classThis = /** @class */ (function () {
        function AuthController_1(authService) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
        }
        AuthController_1.prototype.signUp = function (dto) {
            return this.authService.signUp(dto);
        };
        AuthController_1.prototype.login = function (dto) {
            return this.authService.login(dto);
        };
        AuthController_1.prototype.google = function (dto) {
            return this.authService.googleAuth(dto);
        };
        AuthController_1.prototype.forgotPassword = function (dto) {
            return this.authService.forgotPassword(dto.email);
        };
        AuthController_1.prototype.resetPassword = function (dto) {
            return this.authService.resetPassword(dto);
        };
        // ===== Refresh Token Endpoints =====
        // Public endpoint: client gọi khi access token hết hạn để xin cặp token mới.
        // Không gắn JwtAuthGuard vì access token đã hết hạn ở thời điểm này.
        AuthController_1.prototype.refresh = function (dto) {
            return this.authService.refresh(dto);
        };
        // Protected endpoint: yêu cầu access token còn hạn để xoá refresh token trong DB.
        AuthController_1.prototype.logout = function (req) {
            return this.authService.logout(req.user.sub);
        };
        return AuthController_1;
    }());
    __setFunctionName(_classThis, "AuthController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _signUp_decorators = [(0, common_1.Post)('signup')];
        _login_decorators = [(0, common_1.Post)('login')];
        _google_decorators = [(0, common_1.Post)('google')];
        _forgotPassword_decorators = [(0, common_1.Post)('forgot-password')];
        _resetPassword_decorators = [(0, common_1.Post)('reset-password')];
        _refresh_decorators = [(0, common_1.Post)('refresh'), (0, common_1.HttpCode)(common_1.HttpStatus.OK), (0, swagger_1.ApiOperation)({
                summary: 'Cấp lại Access Token bằng Refresh Token (Token Rotation)',
                description: 'Sau khi access token hết hạn (15 phút), client gửi refreshToken + userId. ' +
                    'Backend verify hash trong DB → nếu hợp lệ, cấp cặp token mới và xoay (rotate) refresh token.',
            }), (0, swagger_1.ApiBody)({ type: refresh_token_dto_1.RefreshTokenDto }), (0, swagger_1.ApiResponse)({
                status: 200,
                description: 'Trả về cặp accessToken + refreshToken mới',
            }), (0, swagger_1.ApiResponse)({
                status: 401,
                description: 'Refresh token không hợp lệ hoặc đã hết hạn',
            })];
        _logout_decorators = [(0, common_1.Post)('logout'), (0, common_1.HttpCode)(common_1.HttpStatus.OK), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)(), (0, swagger_1.ApiOperation)({
                summary: 'Đăng xuất - xoá refresh token trong DB',
                description: 'Vô hiệu hoá refresh token hiện tại của user. Lần sau client phải đăng nhập lại để có session mới.',
            }), (0, swagger_1.ApiResponse)({ status: 200, description: 'Đăng xuất thành công' }), (0, swagger_1.ApiResponse)({ status: 401, description: 'Chưa đăng nhập hoặc token hết hạn' })];
        __esDecorate(_classThis, null, _signUp_decorators, { kind: "method", name: "signUp", static: false, private: false, access: { has: function (obj) { return "signUp" in obj; }, get: function (obj) { return obj.signUp; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: function (obj) { return "login" in obj; }, get: function (obj) { return obj.login; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _google_decorators, { kind: "method", name: "google", static: false, private: false, access: { has: function (obj) { return "google" in obj; }, get: function (obj) { return obj.google; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _forgotPassword_decorators, { kind: "method", name: "forgotPassword", static: false, private: false, access: { has: function (obj) { return "forgotPassword" in obj; }, get: function (obj) { return obj.forgotPassword; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetPassword_decorators, { kind: "method", name: "resetPassword", static: false, private: false, access: { has: function (obj) { return "resetPassword" in obj; }, get: function (obj) { return obj.resetPassword; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refresh_decorators, { kind: "method", name: "refresh", static: false, private: false, access: { has: function (obj) { return "refresh" in obj; }, get: function (obj) { return obj.refresh; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: function (obj) { return "logout" in obj; }, get: function (obj) { return obj.logout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthController = _classThis;
}();
exports.AuthController = AuthController;
