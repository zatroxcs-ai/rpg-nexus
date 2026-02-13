import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RelationService } from './relation.service';
import { RelationController } from './relation.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebsocketModule],
  providers: [RelationService],
  controllers: [RelationController],
})
export class RelationModule {}
