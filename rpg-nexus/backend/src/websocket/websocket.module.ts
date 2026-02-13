// 📍 Fichier : backend/src/websocket/websocket.module.ts
// 🎯 Rôle : Regroupe le Gateway WebSocket et ses dépendances
// 💡 Intègre JWT pour l'authentification des connexions Socket.io

import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiceModule } from '../dice/dice.module';

@Module({
  imports: [
    AuthModule,
	DiceModule,
	PrismaModule,
    // Importe JwtModule pour vérifier les tokens dans le Gateway
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        
        if (!secret) {
          throw new Error('JWT_SECRET n\'est pas défini dans le fichier .env');
        }

        return {
          secret,
          signOptions: {
            expiresIn: '7d',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway], // 📤 Permet aux autres modules d'utiliser le Gateway
})
export class WebsocketModule {}