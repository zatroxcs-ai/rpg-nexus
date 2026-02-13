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
import { CombatModule } from './combat/combat.module';
import { NoteModule } from './note/note.module';
import { NpcModule } from './npc/npc.module';
import { ItemModule } from './item/item.module';
import { RelationModule } from './relation/relation.module';
import { QuestModule } from './quest/quest.module';
import { PlaylistModule } from './playlist/playlist.module';

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
    CombatModule,
    NoteModule,
    NpcModule,
    ItemModule,
    RelationModule,
    QuestModule,
    PlaylistModule,
  ],
})
export class AppModule {}