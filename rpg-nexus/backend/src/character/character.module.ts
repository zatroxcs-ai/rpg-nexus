// 📍 Fichier : backend/src/character/character.module.ts
// 🎯 Rôle : Module NestJS pour les personnages
// 💡 Regroupe le controller, le service et les dépendances

import { Module } from '@nestjs/common';
import { CharacterController } from './character.controller';
import { CharacterService } from './character.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService],
})
export class CharacterModule {}
