// backend/src/dice/dice.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiceService } from './dice.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('dice')
@UseGuards(JwtAuthGuard)
export class DiceController {
  constructor(private diceService: DiceService) {}

  // GET /api/dice/game/:gameId
  // Récupère l'historique des jets d'une partie
  @Get('game/:gameId')
  async getGameDiceRolls(@Param('gameId') gameId: string) {
    return this.diceService.getGameDiceRolls(gameId);
  }

  // GET /api/dice/stats/game/:gameId
  // Récupère les statistiques globales d'une partie
  @Get('stats/game/:gameId')
  async getGameStats(@Param('gameId') gameId: string) {
    return this.diceService.getGameStats(gameId);
  }

  // GET /api/dice/stats/player/:gameId
  // Récupère les statistiques personnelles du joueur dans une partie
  @Get('stats/player/:gameId')
  async getPlayerStats(
    @Param('gameId') gameId: string,
    @GetUser('id') userId: string,
  ) {
    return this.diceService.getPlayerStats(gameId, userId);
  }
}
