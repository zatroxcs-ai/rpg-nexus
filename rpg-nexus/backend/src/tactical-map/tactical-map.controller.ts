// backend/src/tactical-map/tactical-map.controller.ts
// REMPLACE le fichier existant

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
import type { Token, Drawing } from './tactical-map.service';

@Controller('tactical-map')
@UseGuards(JwtAuthGuard)
export class TacticalMapController {
  constructor(private tacticalMapService: TacticalMapService) {}

  // ═══════════════════════════════════════
  // ATLAS
  // ═══════════════════════════════════════

  // GET /api/tactical-map/:gameId/atlas
  @Get(':gameId/atlas')
  async getAtlas(@Param('gameId') gameId: string) {
    return this.tacticalMapService.getAtlas(gameId);
  }

  // GET /api/tactical-map/:gameId/active-scene
  @Get(':gameId/active-scene')
  async getActiveScene(@Param('gameId') gameId: string) {
    return this.tacticalMapService.getActiveScene(gameId);
  }

  // POST /api/tactical-map/:gameId/scene
  @Post(':gameId/scene')
  async createScene(
    @Param('gameId') gameId: string,
    @Body() body: { name: string },
  ) {
    return this.tacticalMapService.createScene(gameId, body.name || 'Nouvelle Scène');
  }

  // DELETE /api/tactical-map/:gameId/scene/:sceneId
  @Delete(':gameId/scene/:sceneId')
  async deleteScene(
    @Param('gameId') gameId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.tacticalMapService.deleteScene(gameId, sceneId);
  }

  // PUT /api/tactical-map/:gameId/switch/:sceneId
  @Put(':gameId/switch/:sceneId')
  async switchScene(
    @Param('gameId') gameId: string,
    @Param('sceneId') sceneId: string,
  ) {
    return this.tacticalMapService.switchScene(gameId, sceneId);
  }

  // PUT /api/tactical-map/:gameId/scene/:sceneId/rename
  @Put(':gameId/scene/:sceneId/rename')
  async renameScene(
    @Param('gameId') gameId: string,
    @Param('sceneId') sceneId: string,
    @Body() body: { name: string },
  ) {
    return this.tacticalMapService.renameScene(gameId, sceneId, body.name);
  }

  // PUT /api/tactical-map/:gameId/scene/:sceneId/config
  @Put(':gameId/scene/:sceneId/config')
  async updateSceneConfig(
    @Param('sceneId') sceneId: string,
    @Param('gameId') gameId: string,
    @Body() config: any,
  ) {
    return this.tacticalMapService.updateSceneConfig(sceneId, config);
  }

  // ═══════════════════════════════════════
  // TOKENS
  // ═══════════════════════════════════════

  // POST /api/tactical-map/:gameId/scene/:sceneId/token
  @Post(':gameId/scene/:sceneId/token')
  async addToken(
    @Param('sceneId') sceneId: string,
    @Body() token: Token,
  ) {
    return this.tacticalMapService.addToken(sceneId, token);
  }

  // PUT /api/tactical-map/:gameId/scene/:sceneId/token/:tokenId/move
  @Put(':gameId/scene/:sceneId/token/:tokenId/move')
  async moveToken(
    @Param('sceneId') sceneId: string,
    @Param('tokenId') tokenId: string,
    @Body() body: { x: number; y: number },
  ) {
    return this.tacticalMapService.moveToken(sceneId, tokenId, body.x, body.y);
  }

  // PUT /api/tactical-map/:gameId/scene/:sceneId/token/:tokenId
  @Put(':gameId/scene/:sceneId/token/:tokenId')
  async updateToken(
    @Param('sceneId') sceneId: string,
    @Param('tokenId') tokenId: string,
    @Body() updates: Partial<Token>,
  ) {
    return this.tacticalMapService.updateToken(sceneId, tokenId, updates);
  }

  // DELETE /api/tactical-map/:gameId/scene/:sceneId/token/:tokenId
  @Delete(':gameId/scene/:sceneId/token/:tokenId')
  async removeToken(
    @Param('sceneId') sceneId: string,
    @Param('tokenId') tokenId: string,
  ) {
    return this.tacticalMapService.removeToken(sceneId, tokenId);
  }

  // ═══════════════════════════════════════
  // DESSINS
  // ═══════════════════════════════════════

  // POST /api/tactical-map/:gameId/scene/:sceneId/drawing
  @Post(':gameId/scene/:sceneId/drawing')
  async addDrawing(
    @Param('sceneId') sceneId: string,
    @Body() drawing: Drawing,
  ) {
    return this.tacticalMapService.addDrawing(sceneId, drawing);
  }

  // DELETE /api/tactical-map/:gameId/scene/:sceneId/drawing/:drawingId
  @Delete(':gameId/scene/:sceneId/drawing/:drawingId')
  async removeDrawing(
    @Param('sceneId') sceneId: string,
    @Param('drawingId') drawingId: string,
  ) {
    return this.tacticalMapService.removeDrawing(sceneId, drawingId);
  }

  // DELETE /api/tactical-map/:gameId/scene/:sceneId/drawings
  @Delete(':gameId/scene/:sceneId/drawings')
  async clearDrawings(@Param('sceneId') sceneId: string) {
    return this.tacticalMapService.clearDrawings(sceneId);
  }

  // POST /api/tactical-map/:gameId/scene/:sceneId/reset
  @Post(':gameId/scene/:sceneId/reset')
  async resetScene(@Param('sceneId') sceneId: string) {
    return this.tacticalMapService.resetScene(sceneId);
  }
}
