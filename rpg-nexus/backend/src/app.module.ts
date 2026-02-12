// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { WebsocketModule } from './websocket/websocket.module';
import { CharacterModule } from './character/character.module';
import { CustomModelModule } from './custom-model/custom-model.module';
import { AssetModule } from './asset/asset.module';
import { DiceModule } from './dice/dice.module';
import { TacticalMapModule } from './tactical-map/tactical-map.module';
import { MonsterModule } from './monster/monster.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GameModule,
    WebsocketModule,
    CharacterModule,
    CustomModelModule,
    AssetModule,
    DiceModule,
    TacticalMapModule,
    MonsterModule,
  ],
})
export class AppModule {}