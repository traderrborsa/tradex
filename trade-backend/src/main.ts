import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { configureStaticUploads } from './uploads/static-uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureStaticUploads(app);
  app.useWebSocketAdapter(new WsAdapter(app));
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3002,http://localhost:4001,http://localhost:4002')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`HTTP  http://localhost:${port}/api`);
  console.log(`WS    ws://localhost:${port}/ws/ticks`);
  console.log(`WS    ws://localhost:${port}/ws/verification`);
  console.log(`WS    ws://localhost:${port}/ws/panel/verification`);
  console.log(`WS    ws://localhost:${port}/ws/portfolio`);
}
bootstrap();
