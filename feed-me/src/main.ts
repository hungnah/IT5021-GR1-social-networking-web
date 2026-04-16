import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // 1. Cấu hình Swagger cho dự án FeedMe
  const config = new DocumentBuilder()
    .setTitle('FeedMe API Documentation')
    .setDescription('Tài liệu API cho mạng xã hội FeedMe - HEDSPI Project [cite: 2, 5]')
    .setVersion('1.0')
    .addTag('Auth', 'Các nghiệp vụ Xác thực và Quản lý tài khoản ')
    .addTag('Users', 'Quản lý thông tin và trang cá nhân [cite: 119]')
    .addTag('Posts', 'Quản lý bài viết và tương tác [cite: 66, 94]')
    .addBearerAuth() // Để test các API yêu cầu đăng nhập bằng JWT
    .build();

  // 2. Tạo tài liệu và thiết lập route truy cập là /api
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 3. Khởi chạy server trên port 3000 (hoặc lấy từ .env)
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`🚀 FeedMe Backend is running on: http://localhost:${port}`);
  logger.log(`📖 Swagger UI is available at: http://localhost:${port}/api`);
}
bootstrap();