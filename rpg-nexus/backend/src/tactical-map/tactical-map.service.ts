// backend/src/tactical-map/tactical-map.service.ts
// REMPLACE le fichier existant

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Token {
  id: string;
  characterId?: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  avatar?: string;
  isEnemy?: boolean;
  hp?: number;
  maxHp?: number;
}

export interface Drawing {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text';
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  strokeWidth?: number;
  opacity?: number;
}

@Injectable()
export class TacticalMapService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════
  // ATLAS (Gestion des scènes)
  // ═══════════════════════════════════════

  async getAtlas(gameId: string) {
    let map = await this.prisma.tacticalMap.findUnique({
      where: { gameId },
      include: { scenes: { orderBy: { order: 'asc' } } },
    });

    if (!map) {
      map = await this.prisma.tacticalMap.create({
        data: {
          gameId,
          scenes: {
            create: [{
              name: 'Scène 1',
              order: 0,
              gridSize: 50,
              gridWidth: 30,
              gridHeight: 20,
              gridColor: '#444444',
              gridOpacity: 0.5,
              backgroundColor: '#1a1a1a',
              backgroundImage: null,
              backgroundOpacity: 1.0,
              cellUnit: '5ft',
              tokens: [],
              drawings: [],
            }],
          },
        },
        include: { scenes: { orderBy: { order: 'asc' } } },
      });

      await this.prisma.tacticalMap.update({
        where: { gameId },
        data: { activeSceneId: map.scenes[0].id },
      });

      map.activeSceneId = map.scenes[0].id;
    }

    return map;
  }

  async getActiveScene(gameId: string) {
    const map = await this.getAtlas(gameId);
    if (!map.activeSceneId) return map.scenes[0] || null;
    return map.scenes.find(s => s.id === map.activeSceneId) || map.scenes[0];
  }

  async createScene(gameId: string, name: string) {
    const map = await this.getAtlas(gameId);
    return this.prisma.mapScene.create({
      data: {
        tacticalMapId: map.id,
        name,
        order: map.scenes.length,
        tokens: [],
        drawings: [],
      },
    });
  }

  async deleteScene(gameId: string, sceneId: string) {
    const map = await this.getAtlas(gameId);
    if (map.scenes.length <= 1) throw new Error('Impossible de supprimer la dernière scène');

    await this.prisma.mapScene.delete({ where: { id: sceneId } });

    if (map.activeSceneId === sceneId) {
      const firstScene = map.scenes.find(s => s.id !== sceneId);
      if (firstScene) {
        await this.prisma.tacticalMap.update({
          where: { gameId },
          data: { activeSceneId: firstScene.id },
        });
      }
    }

    return { success: true };
  }

  async switchScene(gameId: string, sceneId: string) {
    await this.prisma.tacticalMap.update({
      where: { gameId },
      data: { activeSceneId: sceneId },
    });
    return this.getAtlas(gameId);
  }

  async renameScene(gameId: string, sceneId: string, name: string) {
    return this.prisma.mapScene.update({ where: { id: sceneId }, data: { name } });
  }

  async updateSceneConfig(sceneId: string, config: {
    gridSize?: number;
    gridWidth?: number;
    gridHeight?: number;
    gridColor?: string;
    gridOpacity?: number;
    backgroundColor?: string;
    backgroundImage?: string | null;
    backgroundOpacity?: number;
    cellUnit?: string;
  }) {
    return this.prisma.mapScene.update({ where: { id: sceneId }, data: config });
  }

  // ═══════════════════════════════════════
  // TOKENS
  // ═══════════════════════════════════════

  async addToken(sceneId: string, token: Token) {
    const scene = await this.prisma.mapScene.findUniqueOrThrow({ where: { id: sceneId } });
    const tokens = JSON.parse(JSON.stringify(scene.tokens)) as Token[];
    tokens.push({
      ...token,
      id: token.id || `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { tokens: JSON.parse(JSON.stringify(tokens)) },
    });
  }

  async moveToken(sceneId: string, tokenId: string, x: number, y: number) {
    const scene = await this.prisma.mapScene.findUniqueOrThrow({ where: { id: sceneId } });
    const tokens = JSON.parse(JSON.stringify(scene.tokens)) as Token[];
    const updated = tokens.map(t => t.id === tokenId ? { ...t, x, y } : t);
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { tokens: JSON.parse(JSON.stringify(updated)) },
    });
  }

  async removeToken(sceneId: string, tokenId: string) {
    const scene = await this.prisma.mapScene.findUniqueOrThrow({ where: { id: sceneId } });
    const tokens = JSON.parse(JSON.stringify(scene.tokens)) as Token[];
    const filtered = tokens.filter(t => t.id !== tokenId);
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { tokens: JSON.parse(JSON.stringify(filtered)) },
    });
  }

  async updateToken(sceneId: string, tokenId: string, updates: Partial<Token>) {
    const scene = await this.prisma.mapScene.findUniqueOrThrow({ where: { id: sceneId } });
    const tokens = JSON.parse(JSON.stringify(scene.tokens)) as Token[];
    const updated = tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t);
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { tokens: JSON.parse(JSON.stringify(updated)) },
    });
  }

  // ═══════════════════════════════════════
  // DESSINS
  // ═══════════════════════════════════════

  async addDrawing(sceneId: string, drawing: Drawing) {
    const scene = await this.prisma.mapScene.findUniqueOrThrow({ where: { id: sceneId } });
    const drawings = JSON.parse(JSON.stringify(scene.drawings)) as Drawing[];
    drawings.push({
      ...drawing,
      id: drawing.id || `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { drawings: JSON.parse(JSON.stringify(drawings)) },
    });
  }

  async removeDrawing(sceneId: string, drawingId: string) {
    const scene = await this.prisma.mapScene.findUniqueOrThrow({ where: { id: sceneId } });
    const drawings = JSON.parse(JSON.stringify(scene.drawings)) as Drawing[];
    const filtered = drawings.filter(d => d.id !== drawingId);
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { drawings: JSON.parse(JSON.stringify(filtered)) },
    });
  }

  async clearDrawings(sceneId: string) {
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { drawings: [] },
    });
  }

  async resetScene(sceneId: string) {
    return this.prisma.mapScene.update({
      where: { id: sceneId },
      data: { tokens: [], drawings: [] },
    });
  }
}