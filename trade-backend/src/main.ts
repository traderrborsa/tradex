import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { CORS_ORIGINS } from './cors-origins';
import { configureStaticUploads } from './uploads/static-uploads';

const WS_PATHS = [
  '/ws/ticks',
  '/ws/verification',
  '/ws/portfolio',
  '/ws/notifications',
  '/ws/presence',
  '/ws/panel/verification',
  '/ws/panel/transactions',
  '/ws/panel/finance',
  '/ws/panel/notifications',
  '/ws/panel/presence',
] as const;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureStaticUploads(app);
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors({
    origin: CORS_ORIGINS,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  const publicBase =
    process.env.API_PUBLIC_URL?.replace(/\/$/, '') ??
    `http://localhost:${port}`;
  const wsBase = publicBase.replace(/^http/, 'ws');
  await app.listen(port);
  console.log(`HTTP  ${publicBase}/api`);
  for (const path of WS_PATHS) {
    console.log(`WS    ${wsBase}${path}`);
  }
}
bootstrap();
