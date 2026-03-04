import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from '../packages/backend/src/app.module';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from '../packages/backend/src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../packages/backend/src/common/interceptors/transform.interceptor';

const server = express();

let cachedApp: any;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet());

  const frontendUrl = process.env.FRONTEND_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  server(req, res);
}
