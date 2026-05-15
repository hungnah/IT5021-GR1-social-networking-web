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
exports.EmailService = void 0;
var common_1 = require("@nestjs/common");
var nodemailer = require("nodemailer");
var EmailService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var EmailService = _classThis = /** @class */ (function () {
        function EmailService_1(configService) {
            this.configService = configService;
            this.logger = new common_1.Logger(EmailService.name);
        }
        EmailService_1.prototype.sendOtp = function (to, otp) {
            return __awaiter(this, void 0, void 0, function () {
                var smtpHost, transporter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            smtpHost = this.configService.get('SMTP_HOST');
                            if (!smtpHost) {
                                // Dev mode: print OTP to console instead of sending email
                                this.logger.warn('─────────────────────────────────────────');
                                this.logger.warn("[DEV MODE] OTP for ".concat(to, ": ").concat(otp));
                                this.logger.warn('SMTP chưa cấu hình → xem OTP trong log này');
                                this.logger.warn('─────────────────────────────────────────');
                                return [2 /*return*/];
                            }
                            transporter = nodemailer.createTransport({
                                host: smtpHost,
                                port: this.configService.get('SMTP_PORT', 587),
                                secure: false,
                                auth: {
                                    user: this.configService.get('SMTP_USER'),
                                    pass: this.configService.get('SMTP_PASS'),
                                },
                            });
                            return [4 /*yield*/, transporter.sendMail({
                                    from: "\"FeedMe \u26A1\" <".concat(this.configService.get('SMTP_USER'), ">"),
                                    to: to,
                                    subject: 'Mã OTP đặt lại mật khẩu FeedMe',
                                    html: "\n        <div style=\"font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;\n                    background: #0f0f0f; color: white; border-radius: 16px; padding: 40px;\">\n          <h1 style=\"color: white; font-size: 24px; margin-bottom: 8px;\">\u26A1 FeedMe</h1>\n          <h2 style=\"color: #e2e8f0; font-size: 18px; margin-bottom: 24px;\">\n            \u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u\n          </h2>\n          <p style=\"color: #94a3b8; margin-bottom: 24px; line-height: 1.6;\">\n            B\u1EA1n v\u1EEBa y\u00EAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u. Nh\u1EADp m\u00E3 OTP d\u01B0\u1EDBi \u0111\u00E2y v\u00E0o trang web.\n            M\u00E3 c\u00F3 hi\u1EC7u l\u1EF1c trong <strong style=\"color: white;\">10 ph\u00FAt</strong>.\n          </p>\n          <div style=\"background: #1a1a1a; border-radius: 12px; padding: 24px;\n                      text-align: center; margin-bottom: 24px;\">\n            <p style=\"color: #8e8e8e; font-size: 13px; margin-bottom: 8px;\">M\u00E3 OTP c\u1EE7a b\u1EA1n</p>\n            <span style=\"font-size: 40px; font-weight: 800; letter-spacing: 12px;\n                         color: #2563eb;\">".concat(otp, "</span>\n          </div>\n          <p style=\"color: #555; font-size: 12px; line-height: 1.5;\">\n            N\u1EBFu b\u1EA1n kh\u00F4ng y\u00EAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u, h\u00E3y b\u1ECF qua email n\u00E0y.\n            T\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n v\u1EABn an to\u00E0n.\n          </p>\n        </div>\n      "),
                                })];
                        case 1:
                            _a.sent();
                            this.logger.log("OTP email sent to ".concat(to));
                            return [2 /*return*/];
                    }
                });
            });
        };
        return EmailService_1;
    }());
    __setFunctionName(_classThis, "EmailService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmailService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmailService = _classThis;
}();
exports.EmailService = EmailService;
