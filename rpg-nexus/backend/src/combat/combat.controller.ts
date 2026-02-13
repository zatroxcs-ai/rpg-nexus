import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CombatService } from './combat.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('combat')
@UseGuards(JwtAuthGuard)
export class CombatController {
  constructor(
    private combatService: CombatService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromCombat(combatId: string): Promise<string> {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId }, select: { gameId: true } });
    return combat.gameId;
  }

  @Get('game/:gameId')
  async getAllCombats(@Param('gameId') gameId: string) {
    return this.combatService.getAllCombats(gameId);
  }

  @Get('game/:gameId/active')
  async getActiveCombats(@Param('gameId') gameId: string) {
    return this.combatService.getActiveCombats(gameId);
  }

  @Get('game/:gameId/finished')
  async getFinishedCombats(@Param('gameId') gameId: string) {
    return this.combatService.getFinishedCombats(gameId);
  }

  @Post('game/:gameId')
  async createCombat(@Param('gameId') gameId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.createCombat(gameId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/add-character')
  async addCharacter(@Param('combatId') combatId: string, @Request() req, @Body() body: { characterId: string }) {
    const result = await this.combatService.addCharacterToCombat(combatId, req.user.sub || req.user.id, body.characterId);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/add-monster')
  async addMonster(@Param('combatId') combatId: string, @Request() req, @Body() body: { monsterId: string }) {
    const result = await this.combatService.addMonsterToCombat(combatId, req.user.sub || req.user.id, body.monsterId);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Delete(':combatId/participant/:participantId')
  async removeParticipant(@Param('combatId') combatId: string, @Param('participantId') participantId: string, @Request() req) {
    const gameId = await this.getGameIdFromCombat(combatId);
    const result = await this.combatService.removeParticipant(combatId, req.user.sub || req.user.id, participantId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/next-turn')
  async nextTurn(@Param('combatId') combatId: string, @Request() req) {
    const result = await this.combatService.nextTurn(combatId, req.user.sub || req.user.id);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/attack')
  async attack(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.performAttack(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/damage')
  async damage(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.applyDamage(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/heal')
  async heal(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.healParticipant(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Put(':combatId/initiative')
  async updateInitiative(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.updateInitiative(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/end')
  async endCombat(@Param('combatId') combatId: string, @Request() req) {
    const gameId = await this.getGameIdFromCombat(combatId);
    const result = await this.combatService.endCombat(combatId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/toggle-auto')
  async toggleAutoMode(@Param('combatId') combatId: string, @Request() req) {
    const result = await this.combatService.toggleAutoMode(combatId, req.user.sub || req.user.id);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Put(':combatId/conditions')
  async updateConditions(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.updateConditions(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/player-attack')
  async playerAttack(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.playerAttack(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/player-flee')
  async playerFlee(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.playerFlee(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }

  @Post(':combatId/player-end-turn')
  async playerEndTurn(@Param('combatId') combatId: string, @Request() req, @Body() body: any) {
    const result = await this.combatService.playerEndTurn(combatId, req.user.sub || req.user.id, body);
    const gameId = await this.getGameIdFromCombat(combatId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'combat');
    return result;
  }
}
