// backend/src/tactical-map/tactical-map.module.ts
import { Module } from '@nestjs/common';
import { TacticalMapController } from './tactical-map.controller';
import { TacticalMapService } from './tactical-map.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TacticalMapController],
  providers: [TacticalMapService],
  exports: [TacticalMapService],
})
export class TacticalMapModule {}
