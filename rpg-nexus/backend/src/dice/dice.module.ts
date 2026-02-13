// backend/src/dice/dice.module.ts
import { Module } from '@nestjs/common';
import { DiceController } from './dice.controller';
import { DiceService } from './dice.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiceController],
  providers: [DiceService],
  exports: [DiceService], // Export pour utiliser dans WebsocketGateway
})
export class DiceModule {}
