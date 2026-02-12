// 📍 Fichier : backend/src/game/game.module.ts
// 🎯 Rôle : Regroupe tous les éléments du système de gestion des parties
// 💡 Importe AuthModule pour utiliser les Guards de sécurité

import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Permet d'utiliser JwtAuthGuard et RolesGuard
  controllers: [GameController],
  providers: [GameService],
  exports: [GameService], // 📤 Permet aux autres modules d'utiliser GameService
})
export class GameModule {}