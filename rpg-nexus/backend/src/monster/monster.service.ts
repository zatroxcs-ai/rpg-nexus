// backend/src/monster/monster.service.ts

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MonsterAction {
  id: string;
  name: string;
  description: string;
  damage?: string;
}

@Injectable()
export class MonsterService {
  constructor(private prisma: PrismaService) {}

  async getAll(gameId: string) {
    return this.prisma.monster.findMany({
      where: { gameId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOne(id: string) {
    return this.prisma.monster.findUniqueOrThrow({ where: { id } });
  }

  async create(gameId: string, userId: string, data: any) {
    // Vérifier que c'est le MJ
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut créer des monstres');

    return this.prisma.monster.create({
      data: {
        gameId,
        name: data.name,
        avatar: data.avatar || null,
        description: data.description || null,
        showHp: data.showHp ?? false,
        showAc: data.showAc ?? false,
        showStats: data.showStats ?? false,
        showSpeed: data.showSpeed ?? false,
        showActions: data.showActions ?? false,
        hp: data.hp ?? null,
        maxHp: data.maxHp ?? null,
        ac: data.ac ?? null,
        strength: data.strength ?? null,
        dexterity: data.dexterity ?? null,
        constitution: data.constitution ?? null,
        intelligence: data.intelligence ?? null,
        wisdom: data.wisdom ?? null,
        charisma: data.charisma ?? null,
        speed: data.speed ?? null,
        actions: data.actions ?? [],
        challengeRating: data.challengeRating || null,
        type: data.type || null,
        size: data.size || null,
      },
    });
  }

  async update(id: string, userId: string, data: any) {
    const monster = await this.prisma.monster.findUniqueOrThrow({ where: { id } });
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: monster.gameId } });
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut modifier les monstres');

    return this.prisma.monster.update({
      where: { id },
      data: {
        name: data.name,
        avatar: data.avatar ?? monster.avatar,
        description: data.description ?? monster.description,
        showHp: data.showHp ?? monster.showHp,
        showAc: data.showAc ?? monster.showAc,
        showStats: data.showStats ?? monster.showStats,
        showSpeed: data.showSpeed ?? monster.showSpeed,
        showActions: data.showActions ?? monster.showActions,
        hp: data.hp ?? monster.hp,
        maxHp: data.maxHp ?? monster.maxHp,
        ac: data.ac ?? monster.ac,
        strength: data.strength ?? monster.strength,
        dexterity: data.dexterity ?? monster.dexterity,
        constitution: data.constitution ?? monster.constitution,
        intelligence: data.intelligence ?? monster.intelligence,
        wisdom: data.wisdom ?? monster.wisdom,
        charisma: data.charisma ?? monster.charisma,
        speed: data.speed ?? monster.speed,
        actions: data.actions ?? monster.actions,
        challengeRating: data.challengeRating ?? monster.challengeRating,
        type: data.type ?? monster.type,
        size: data.size ?? monster.size,
      },
    });
  }

  async delete(id: string, userId: string) {
    const monster = await this.prisma.monster.findUniqueOrThrow({ where: { id } });
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: monster.gameId } });
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut supprimer les monstres');

    await this.prisma.monster.delete({ where: { id } });
    return { success: true };
  }
}
