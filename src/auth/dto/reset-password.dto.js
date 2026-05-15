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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordDto = void 0;
var class_validator_1 = require("class-validator");
var ResetPasswordDto = function () {
    var _a;
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _otp_decorators;
    var _otp_initializers = [];
    var _otp_extraInitializers = [];
    var _newPassword_decorators;
    var _newPassword_initializers = [];
    var _newPassword_extraInitializers = [];
    var _confirmNewPassword_decorators;
    var _confirmNewPassword_initializers = [];
    var _confirmNewPassword_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ResetPasswordDto() {
                this.email = __runInitializers(this, _email_initializers, void 0);
                this.otp = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _otp_initializers, void 0));
                this.newPassword = (__runInitializers(this, _otp_extraInitializers), __runInitializers(this, _newPassword_initializers, void 0));
                this.confirmNewPassword = (__runInitializers(this, _newPassword_extraInitializers), __runInitializers(this, _confirmNewPassword_initializers, void 0));
                __runInitializers(this, _confirmNewPassword_extraInitializers);
            }
            return ResetPasswordDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _email_decorators = [(0, class_validator_1.IsEmail)(), (0, class_validator_1.IsNotEmpty)()];
            _otp_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.Length)(6, 6, { message: 'Mã OTP gồm đúng 6 chữ số' })];
            _newPassword_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)(), (0, class_validator_1.MinLength)(8), (0, class_validator_1.MaxLength)(64), (0, class_validator_1.Matches)(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
                    message: 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt',
                })];
            _confirmNewPassword_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
            __esDecorate(null, null, _otp_decorators, { kind: "field", name: "otp", static: false, private: false, access: { has: function (obj) { return "otp" in obj; }, get: function (obj) { return obj.otp; }, set: function (obj, value) { obj.otp = value; } }, metadata: _metadata }, _otp_initializers, _otp_extraInitializers);
            __esDecorate(null, null, _newPassword_decorators, { kind: "field", name: "newPassword", static: false, private: false, access: { has: function (obj) { return "newPassword" in obj; }, get: function (obj) { return obj.newPassword; }, set: function (obj, value) { obj.newPassword = value; } }, metadata: _metadata }, _newPassword_initializers, _newPassword_extraInitializers);
            __esDecorate(null, null, _confirmNewPassword_decorators, { kind: "field", name: "confirmNewPassword", static: false, private: false, access: { has: function (obj) { return "confirmNewPassword" in obj; }, get: function (obj) { return obj.confirmNewPassword; }, set: function (obj, value) { obj.confirmNewPassword = value; } }, metadata: _metadata }, _confirmNewPassword_initializers, _confirmNewPassword_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ResetPasswordDto = ResetPasswordDto;
