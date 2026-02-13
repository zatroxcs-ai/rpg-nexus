import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RelationService } from './relation.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('relation')
@UseGuards(JwtAuthGuard)
export class RelationController {
  constructor(
    private relationService: RelationService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromRelation(relationId: string): Promise<string> {
    const r = await this.prisma.relation.findUniqueOrThrow({ where: { id: relationId }, select: { gameId: true } });
    return r.gameId;
  }

  @Get('game/:gameId')
  async getGameRelations(@Param('gameId') gameId: string) {
    return this.relationService.getGameRelations(gameId);
  }

  @Post('game/:gameId')
  async createRelation(@Param('gameId') gameId: string, @Request() req, @Body() body: any) {
    const result = await this.relationService.createRelation(gameId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'relation');
    return result;
  }

  @Put(':relationId')
  async updateRelation(@Param('relationId') relationId: string, @Request() req, @Body() body: any) {
    const gameId = await this.getGameIdFromRelation(relationId);
    const result = await this.relationService.updateRelation(relationId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'relation');
    return result;
  }

  @Delete(':relationId')
  async deleteRelation(@Param('relationId') relationId: string, @Request() req) {
    const gameId = await this.getGameIdFromRelation(relationId);
    const result = await this.relationService.deleteRelation(relationId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'relation');
    return result;
  }
}
