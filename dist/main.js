"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger('Bootstrap');
    if (process.env.NODE_ENV !== 'production') {
        const expressApp = app.getHttpAdapter().getInstance();
        expressApp.get('/', (_req, res) => {
            res.redirect('http://localhost:5173');
        });
    }
    app.enableCors({
        origin: ['http://localhost:5173'],
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('FeedMe API Documentation')
        .setDescription('Tài liệu API cho mạng xã hội FeedMe - HEDSPI Project [cite: 2, 5]')
        .setVersion('1.0')
        .addTag('Auth', 'Các nghiệp vụ Xác thực và Quản lý tài khoản ')
        .addTag('Users', 'Quản lý thông tin và trang cá nhân [cite: 119]')
        .addTag('Posts', 'Quản lý bài viết và tương tác [cite: 66, 94]')
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