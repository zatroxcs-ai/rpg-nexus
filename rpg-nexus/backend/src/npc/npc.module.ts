import { Module } from '@nestjs/common';
import { NpcController } from './npc.controller';
import { NpcService } from './npc.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebsocketModule],
  controllers: [NpcController],
  providers: [NpcService],
})
export class NpcModule {}
