// 📍 Fichier : backend/src/custom-model/custom-model.module.ts
// 🎯 Rôle : Module NestJS pour les templates de personnages
// 💡 Regroupe le controller, le service et les dépendances

import { Module } from '@nestjs/common';
import { CustomModelController } from './custom-model.controller';
import { CustomModelService } from './custom-model.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomModelController],
  providers: [CustomModelService],
  exports: [CustomModelService],
})
export class CustomModelModule {}
