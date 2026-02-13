import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // CORS dynamique — accepte localhost en dev + l'URL Railway en prod
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ];

  // FRONTEND_URL est défini dans les variables Railway
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  if (frontendUrl) allowedOrigins.push(frontendUrl);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
    },
  });

  // Railway injecte PORT automatiquement
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0'); // 0.0.0.0 obligatoire sur Railway

  console.log(`🚀 Serveur NestJS lancé sur le port ${port}`);
}

bootstrap();
