import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve uploaded files (avatars, etc.)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // Trong môi trường dev, truy cập "/" ở backend sẽ chuyển qua frontend Vite.
  if (process.env.NODE_ENV !== 'production') {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('/', (_req: unknown, res: { redirect: (url: string) => void }) => {
      res.redirect('http://localhost:5173');
    });
  }

  const corsOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://it-5021-gr-1-social-networking-web.vercel.app',
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : []),
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 1. Cấu hình Swagger cho dự án FeedMe
  const config = new DocumentBuilder()
    .setTitle('FeedMe API Documentation')
    .setDescription('Tài liệu API cho mạng xã hội FeedMe - HEDSPI Project [cite: 2, 5]')
    .setVersion('1.0')
    .addTag('Auth', 'Các nghiệp vụ Xác thực và Quản lý tài khoản ')
    .addTag('Users', 'Quản lý thông tin và trang cá nhân [cite: 119]')
    .addTag('Posts', 'Quản lý bài viết và tương tác [cite: 66, 94]')
    .addTag('Notifications', 'Thông báo người dùng')
    .addTag('Search', 'Tìm kiếm người dùng và bài viết')
    .addBearerAuth() // Để test các API yêu cầu đăng nhập bằng JWT
    .build();

  // 2. Tạo tài liệu và thiết lập route truy cập là /api
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 3. Khởi chạy server trên port 3000 (hoặc lấy từ .env)
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 FeedMe Backend is running on: http://localhost:${port}`);
  logger.log(`📖 Swagger UI is available at: http://localhost:${port}/api`);
}
bootstrap();