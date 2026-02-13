import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MonsterService } from './monster.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('monster')
@UseGuards(JwtAuthGuard)
export class MonsterController {
  constructor(
    private monsterService: MonsterService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromMonster(monsterId: string): Promise<string> {
    const m = await this.prisma.monster.findUniqueOrThrow({ where: { id: monsterId }, select: { gameId: true } });
    return m.gameId;
  }

  @Get('game/:gameId')
  async getAll(@Param('gameId') gameId: string) {
    return this.monsterService.getAll(gameId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.monsterService.getOne(id);
  }

  @Post('game/:gameId')
  async create(@Param('gameId') gameId: string, @Request() req, @Body() body: any) {
    const result = await this.monsterService.create(gameId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'monster');
    return result;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() body: any) {
    const gameId = await this.getGameIdFromMonster(id);
    const result = await this.monsterService.update(id, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'monster');
    return result;
  }

  @Put(':id/hp')
  async updateHp(@Param('id') id: string, @Request() req, @Body() body: any) {
    const gameId = await this.getGameIdFromMonster(id);
    const result = await this.monsterService.update(id, req.user.sub || req.user.id, { hp: body.hp });
    this.wsGateway.broadcastGameDataChanged(gameId, 'monster');
    return result;
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const gameId = await this.getGameIdFromMonster(id);
    const result = await this.monsterService.delete(id, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'monster');
    return result;
  }
}
