// backend/src/tactical-map/tactical-map.module.ts
import { Module } from '@nestjs/common';
import { TacticalMapController } from './tactical-map.controller';
import { TacticalMapService } from './tactical-map.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebsocketModule],
  controllers: [TacticalMapController],
  providers: [TacticalMapService],
  exports: [TacticalMapService],
})
export class TacticalMapModule {}
