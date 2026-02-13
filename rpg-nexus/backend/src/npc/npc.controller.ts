import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NpcService } from './npc.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('npc')
@UseGuards(JwtAuthGuard)
export class NpcController {
  constructor(
    private npcService: NpcService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromNpc(npcId: string): Promise<string> {
    const npc = await this.prisma.npc.findUniqueOrThrow({ where: { id: npcId }, select: { gameId: true } });
    return npc.gameId;
  }

  @Get('game/:gameId')
  async getGameNpcs(@Param('gameId') gameId: string) {
    return this.npcService.getGameNpcs(gameId);
  }

  @Get(':npcId')
  async getNpc(@Param('npcId') npcId: string) {
    return this.npcService.getNpc(npcId);
  }

  @Post('game/:gameId')
  async createNpc(@Param('gameId') gameId: string, @Request() req, @Body() body: any) {
    const result = await this.npcService.createNpc(gameId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'npc');
    return result;
  }

  @Put(':npcId')
  async updateNpc(@Param('npcId') npcId: string, @Request() req, @Body() body: any) {
    const gameId = await this.getGameIdFromNpc(npcId);
    const result = await this.npcService.updateNpc(npcId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'npc');
    return result;
  }

  @Delete(':npcId')
  async deleteNpc(@Param('npcId') npcId: string, @Request() req) {
    const gameId = await this.getGameIdFromNpc(npcId);
    const result = await this.npcService.deleteNpc(npcId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'npc');
    return result;
  }
}
