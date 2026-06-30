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

  const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // SSR / curl / server-to-server requests
      if (!origin) return callback(null, true);

      // DEV fallback (boşsa her şeyi aç)
      if (corsOrigins.length === 0) {
        return callback(null, true);
      }

      // allowlist kontrolü
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
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
