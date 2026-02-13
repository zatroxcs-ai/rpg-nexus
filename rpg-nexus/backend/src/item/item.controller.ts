import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ItemService } from './item.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('item')
@UseGuards(JwtAuthGuard)
export class ItemController {
  constructor(
    private itemService: ItemService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromItem(itemId: string): Promise<string> {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId }, select: { gameId: true } });
    return item.gameId;
  }

  @Get('game/:gameId')
  async getGameItems(@Param('gameId') gameId: string) {
    return this.itemService.getGameItems(gameId);
  }

  @Get(':itemId')
  async getItem(@Param('itemId') itemId: string) {
    return this.itemService.getItem(itemId);
  }

  @Post('game/:gameId')
  async createItem(@Param('gameId') gameId: string, @Request() req, @Body() body: any) {
    const result = await this.itemService.createItem(gameId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Put(':itemId')
  async updateItem(@Param('itemId') itemId: string, @Request() req, @Body() body: any) {
    const gameId = await this.getGameIdFromItem(itemId);
    const result = await this.itemService.updateItem(itemId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Delete(':itemId')
  async deleteItem(@Param('itemId') itemId: string, @Request() req) {
    const gameId = await this.getGameIdFromItem(itemId);
    const result = await this.itemService.deleteItem(itemId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Put(':itemId/assign')
  async assignItem(@Param('itemId') itemId: string, @Request() req, @Body() body: any) {
    const gameId = await this.getGameIdFromItem(itemId);
    const result = await this.itemService.assignItem(itemId, req.user.sub || req.user.id, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Get('entity/:type/:entityId')
  async getEntityItems(@Param('type') type: string, @Param('entityId') entityId: string) {
    return this.itemService.getEntityItems(type, entityId);
  }

  @Put(':itemId/use')
  async useItem(@Param('itemId') itemId: string, @Request() req) {
    const gameId = await this.getGameIdFromItem(itemId);
    const result = await this.itemService.useItem(itemId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Put(':itemId/deactivate')
  async deactivateItem(@Param('itemId') itemId: string, @Request() req) {
    const gameId = await this.getGameIdFromItem(itemId);
    const result = await this.itemService.deactivateItem(itemId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Put(':itemId/tick')
  async tickItem(@Param('itemId') itemId: string, @Request() req) {
    const gameId = await this.getGameIdFromItem(itemId);
    const result = await this.itemService.tickItem(itemId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }

  @Put('game/:gameId/tick-all')
  async tickAllActiveItems(@Param('gameId') gameId: string, @Request() req) {
    const result = await this.itemService.tickAllActiveItems(gameId, req.user.sub || req.user.id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'item');
    return result;
  }
}
