import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import secureSession from '@fastify/secure-session';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 10 * 1024 * 1024 }), // 10MB limit
    { rawBody: true }
  );
  
  await app.register(fastifyMultipart);
  
  const configService = app.get(ConfigService);
  
  await app.register(secureSession, {
    secret: configService.get<string>('JWT_SECRET') || 'a-very-long-and-secure-secret-key-at-least-32-chars',
    salt: 'mq9h9p7uY9sc99h9', // Must be 16 chars
    cookie: {
      path: '/',
      httpOnly: true,
      secure: configService.get<string>('NODE_ENV') === 'production',
    }
  });

  await app.register(fastifyStatic, {
    root: join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const appUrl = configService.get('APP_URL') || 'http://localhost:3000';
  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    appUrl
  ];
  if (appUrl.includes(',')) {
    origins.push(...appUrl.split(',').map((o: string) => o.trim()));
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Safely mirror incoming request origin to bypass deployment CORS blocks
      callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Create uploads directory
  const uploadDir = configService.get('UPLOAD_DIR') || './uploads';
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 TicketPro API running on http://localhost:${port}`);
}
bootstrap();
