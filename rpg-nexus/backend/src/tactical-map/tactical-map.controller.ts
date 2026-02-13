import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TacticalMapService } from './tactical-map.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import type { Token, Drawing } from './tactical-map.service';

@Controller('tactical-map')
@UseGuards(JwtAuthGuard)
export class TacticalMapController {
  constructor(
    private tacticalMapService: TacticalMapService,
    private wsGateway: WebsocketGateway,
  ) {}

  @Get(':gameId/atlas')
  async getAtlas(@Param('gameId') gameId: string) {
    return this.tacticalMapService.getAtlas(gameId);
  }

  @Get(':gameId/active-scene')
  async getActiveScene(@Param('gameId') gameId: string) {
    return this.tacticalMapService.getActiveScene(gameId);
  }

  @Post(':gameId/scene')
  async createScene(@Param('gameId') gameId: string, @Body() body: { name: string }) {
    const result = await this.tacticalMapService.createScene(gameId, body.name || 'Nouvelle Scene');
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Delete(':gameId/scene/:sceneId')
  async deleteScene(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string) {
    const result = await this.tacticalMapService.deleteScene(gameId, sceneId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Put(':gameId/switch/:sceneId')
  async switchScene(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string) {
    const result = await this.tacticalMapService.switchScene(gameId, sceneId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Put(':gameId/scene/:sceneId/rename')
  async renameScene(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Body() body: { name: string }) {
    const result = await this.tacticalMapService.renameScene(gameId, sceneId, body.name);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Put(':gameId/scene/:sceneId/config')
  async updateSceneConfig(@Param('sceneId') sceneId: string, @Param('gameId') gameId: string, @Body() config: any) {
    const result = await this.tacticalMapService.updateSceneConfig(sceneId, config);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Post(':gameId/scene/:sceneId/token')
  async addToken(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Body() token: Token) {
    const result = await this.tacticalMapService.addToken(sceneId, token);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Put(':gameId/scene/:sceneId/token/:tokenId/move')
  async moveToken(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Param('tokenId') tokenId: string, @Body() body: { x: number; y: number }) {
    const result = await this.tacticalMapService.moveToken(sceneId, tokenId, body.x, body.y);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Put(':gameId/scene/:sceneId/token/:tokenId')
  async updateToken(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Param('tokenId') tokenId: string, @Body() updates: Partial<Token>) {
    const result = await this.tacticalMapService.updateToken(sceneId, tokenId, updates);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Delete(':gameId/scene/:sceneId/token/:tokenId')
  async removeToken(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Param('tokenId') tokenId: string) {
    const result = await this.tacticalMapService.removeToken(sceneId, tokenId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Post(':gameId/scene/:sceneId/drawing')
  async addDrawing(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Body() drawing: Drawing) {
    const result = await this.tacticalMapService.addDrawing(sceneId, drawing);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Delete(':gameId/scene/:sceneId/drawing/:drawingId')
  async removeDrawing(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string, @Param('drawingId') drawingId: string) {
    const result = await this.tacticalMapService.removeDrawing(sceneId, drawingId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Delete(':gameId/scene/:sceneId/drawings')
  async clearDrawings(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string) {
    const result = await this.tacticalMapService.clearDrawings(sceneId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }

  @Post(':gameId/scene/:sceneId/reset')
  async resetScene(@Param('gameId') gameId: string, @Param('sceneId') sceneId: string) {
    const result = await this.tacticalMapService.resetScene(sceneId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'tactical-map');
    return result;
  }
}
