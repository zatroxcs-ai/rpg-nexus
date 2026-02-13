import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

  private async assertGameOwner(gameId: string, userId: string) {
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (game.ownerId !== userId) {
      throw new ForbiddenException('Seul le MJ peut gerer les objets');
    }
    return game;
  }

  async getGameItems(gameId: string) {
    return this.prisma.item.findMany({
      where: { gameId },
      orderBy: { name: 'asc' },
    });
  }

  async getItem(itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Objet introuvable');
    return item;
  }

  async createItem(gameId: string, userId: string, data: any) {
    await this.assertGameOwner(gameId, userId);

    return this.prisma.item.create({
      data: {
        gameId,
        name: data.name,
        description: data.description || null,
        image: data.image || null,
        rarity: data.rarity || 'commun',
        category: data.category || 'divers',
        weight: data.weight != null ? parseFloat(data.weight) : null,
        value: data.value != null ? parseInt(data.value) : null,
        effects: data.effects || [],
        isConsumable: data.isConsumable || false,
        duration: data.duration != null ? parseInt(data.duration) : null,
      },
    });
  }

  async updateItem(itemId: string, userId: string, data: any) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    await this.assertGameOwner(item.gameId, userId);

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        name: data.name ?? item.name,
        description: data.description ?? item.description,
        image: data.image ?? item.image,
        rarity: data.rarity ?? item.rarity,
        category: data.category ?? item.category,
        weight: data.weight !== undefined ? (data.weight != null ? parseFloat(data.weight) : null) : item.weight,
        value: data.value !== undefined ? (data.value != null ? parseInt(data.value) : null) : item.value,
        effects: data.effects ?? item.effects,
        isConsumable: data.isConsumable !== undefined ? data.isConsumable : item.isConsumable,
        duration: data.duration !== undefined ? (data.duration != null ? parseInt(data.duration) : null) : item.duration,
        assignedToType: data.assignedToType !== undefined ? data.assignedToType : item.assignedToType,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : item.assignedToId,
      },
    });
  }

  async deleteItem(itemId: string, userId: string) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    await this.assertGameOwner(item.gameId, userId);

    await this.prisma.item.delete({ where: { id: itemId } });
    return { success: true };
  }

  async assignItem(itemId: string, userId: string, data: { assignedToType: string | null; assignedToId: string | null }) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    await this.assertGameOwner(item.gameId, userId);

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        assignedToType: data.assignedToType,
        assignedToId: data.assignedToId,
      },
    });
  }

  async getEntityItems(assignedToType: string, assignedToId: string) {
    return this.prisma.item.findMany({
      where: { assignedToType, assignedToId },
      orderBy: { name: 'asc' },
    });
  }

  async useItem(itemId: string, userId: string) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    await this.assertGameOwner(item.gameId, userId);

    if (!item.isConsumable) {
      throw new ForbiddenException('Cet objet n\'est pas un consommable');
    }

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        isActive: true,
        remainingTurns: item.duration,
      },
    });
  }

  async deactivateItem(itemId: string, userId: string) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    await this.assertGameOwner(item.gameId, userId);

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        isActive: false,
        remainingTurns: null,
      },
    });
  }

  async tickItem(itemId: string, userId: string) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: itemId } });
    await this.assertGameOwner(item.gameId, userId);

    if (!item.isActive || !item.isConsumable) {
      return item;
    }

    const newRemaining = (item.remainingTurns ?? 0) - 1;

    if (newRemaining <= 0) {
      return this.prisma.item.update({
        where: { id: itemId },
        data: {
          isActive: false,
          remainingTurns: null,
        },
      });
    }

    return this.prisma.item.update({
      where: { id: itemId },
      data: {
        remainingTurns: newRemaining,
      },
    });
  }

  async tickAllActiveItems(gameId: string, userId: string) {
    await this.assertGameOwner(gameId, userId);

    const activeItems = await this.prisma.item.findMany({
      where: { gameId, isConsumable: true, isActive: true },
    });

    const results: any[] = [];
    for (const item of activeItems) {
      const newRemaining = (item.remainingTurns ?? 0) - 1;
      if (newRemaining <= 0) {
        results.push(await this.prisma.item.update({
          where: { id: item.id },
          data: { isActive: false, remainingTurns: null },
        }));
      } else {
        results.push(await this.prisma.item.update({
          where: { id: item.id },
          data: { remainingTurns: newRemaining },
        }));
      }
    }
    return results;
  }
}
