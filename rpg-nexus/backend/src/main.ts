// 📍 Fichier : backend/src/main.ts
// 🎯 Rôle : Démarre le serveur NestJS et configure les middlewares
// 💡 C'est le PREMIER fichier exécuté quand tu lances "npm run start"

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🌍 CORS : Autorise le frontend (React) à communiquer avec le backend
  app.enableCors({
    origin: ['http://localhost:5174', 'http://localhost:3000', 'http://localhost:5173'], // Vite + React par défaut
    credentials: true,
  });

  // ✅ Validation automatique des DTOs (RegisterDto, LoginDto, etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les propriétés non déclarées dans les DTOs
      forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés inconnues
      transform: true, // Transforme automatiquement les types (ex: "123" → 123)
    }),
  );

  // 🚀 Préfixe global pour toutes les routes API
  app.setGlobalPrefix('api');

  // 📁 Servir les fichiers statiques (uploads)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 🎧 Récupère le port depuis .env (par défaut 3000)
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // ⚡ Démarrage du serveur (UN SEUL app.listen !)
  await app.listen(port);
  
  console.log(`🚀 Serveur NestJS lancé sur http://localhost:${port}`);
  console.log(`📖 API disponible sur http://localhost:${port}/api`);
}

bootstrap();