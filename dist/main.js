"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger('Bootstrap');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads/' });
    if (process.env.NODE_ENV !== 'production') {
        const expressApp = app.getHttpAdapter().getInstance();
        expressApp.get('/', (_req, res) => {
            res.redirect('http://localhost:5173');
        });
    }
    const isProd = process.env.NODE_ENV === 'production';
    app.enableCors(isProd
        ? {
            origin: [
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                ...(process.env.CORS_ORIGINS
                    ? process.env.CORS_ORIGINS.split(',')
                        .map((o) => o.trim())
                        .filter(Boolean)
                    : []),
            ],
            credentials: true,
        }
        : { origin: true, credentials: true });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('FeedMe API Documentation')
        .setDescription('Tài liệu API cho mạng xã hội FeedMe - HEDSPI Project [cite: 2, 5]')
        .setVersion('1.0')
        .addTag('Auth', 'Các nghiệp vụ Xác thực và Quản lý tài khoản ')
        .addTag('Users', 'Quản lý thông tin và trang cá nhân [cite: 119]')
        .addTag('Posts', 'Quản lý bài viết và tương tác [cite: 66, 94]')
        .addTag('Notifications', 'Thông báo người dùng')
        .addTag('Search', 'Tìm kiếm người dùng và bài viết')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 FeedMe Backend is running on: http://localhost:${port}`);
    logger.log(`📖 Swagger UI is available at: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map