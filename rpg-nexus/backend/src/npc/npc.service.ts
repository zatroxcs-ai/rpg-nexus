import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NpcService {
  constructor(private prisma: PrismaService) {}

  private async assertGameOwner(gameId: string, userId: string) {
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (game.ownerId !== userId) {
      throw new ForbiddenException('Only the GM can manage NPCs');
    }
    return game;
  }

  async getGameNpcs(gameId: string) {
    return this.prisma.npc.findMany({
      where: { gameId },
      orderBy: { name: 'asc' },
    });
  }

  async getNpc(npcId: string) {
    const npc = await this.prisma.npc.findUnique({ where: { id: npcId } });
    if (!npc) {
      throw new NotFoundException('NPC not found');
    }
    return npc;
  }

  async createNpc(gameId: string, userId: string, data: any) {
    await this.assertGameOwner(gameId, userId);

    return this.prisma.npc.create({
      data: {
        gameId,
        name: data.name,
        avatar: data.avatar || null,
        description: data.description || null,
        role: data.role || null,
        location: data.location || null,
        isVisible: data.isVisible ?? true,
        hp: data.hp ?? null,
        maxHp: data.maxHp ?? null,
        ac: data.ac ?? null,
        strength: data.strength ?? null,
        dexterity: data.dexterity ?? null,
        constitution: data.constitution ?? null,
        intelligence: data.intelligence ?? null,
        wisdom: data.wisdom ?? null,
        charisma: data.charisma ?? null,
        inventory: data.inventory ?? [],
        notes: data.notes || null,
      },
    });
  }

  async updateNpc(npcId: string, userId: string, data: any) {
    const npc = await this.prisma.npc.findUniqueOrThrow({ where: { id: npcId } });
    await this.assertGameOwner(npc.gameId, userId);

    return this.prisma.npc.update({
      where: { id: npcId },
      data: {
        name: data.name ?? npc.name,
        avatar: data.avatar ?? npc.avatar,
        description: data.description ?? npc.description,
        role: data.role ?? npc.role,
        location: data.location ?? npc.location,
        isVisible: data.isVisible ?? npc.isVisible,
        hp: data.hp ?? npc.hp,
        maxHp: data.maxHp ?? npc.maxHp,
        ac: data.ac ?? npc.ac,
        strength: data.strength ?? npc.strength,
        dexterity: data.dexterity ?? npc.dexterity,
        constitution: data.constitution ?? npc.constitution,
        intelligence: data.intelligence ?? npc.intelligence,
        wisdom: data.wisdom ?? npc.wisdom,
        charisma: data.charisma ?? npc.charisma,
        inventory: data.inventory ?? npc.inventory,
        notes: data.notes ?? npc.notes,
      },
    });
  }

  async deleteNpc(npcId: string, userId: string) {
    const npc = await this.prisma.npc.findUniqueOrThrow({ where: { id: npcId } });
    await this.assertGameOwner(npc.gameId, userId);

    await this.prisma.npc.delete({ where: { id: npcId } });
    return { success: true };
  }
}
