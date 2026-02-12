// backend/src/monster/monster.module.ts

import { Module } from '@nestjs/common';
import { MonsterController } from './monster.controller';
import { MonsterService } from './monster.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MonsterController],
  providers: [MonsterService],
})
export class MonsterModule {}
