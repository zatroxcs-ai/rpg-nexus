import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelationService {
  constructor(private prisma: PrismaService) {}

  private async assertGameOwner(gameId: string, userId: string) {
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (game.ownerId !== userId) throw new ForbiddenException();
  }

  async getGameRelations(gameId: string) {
    return this.prisma.relation.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRelation(gameId: string, userId: string, data: any) {
    await this.assertGameOwner(gameId, userId);
    return this.prisma.relation.create({
      data: {
        gameId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        sourceName: data.sourceName,
        targetType: data.targetType,
        targetId: data.targetId,
        targetName: data.targetName,
        type: data.type || 'neutre',
        label: data.label || null,
        notes: data.notes || null,
      },
    });
  }

  async updateRelation(relationId: string, userId: string, data: any) {
    const relation = await this.prisma.relation.findUniqueOrThrow({ where: { id: relationId } });
    await this.assertGameOwner(relation.gameId, userId);
    return this.prisma.relation.update({
      where: { id: relationId },
      data: {
        type: data.type ?? relation.type,
        label: data.label !== undefined ? data.label : relation.label,
        notes: data.notes !== undefined ? data.notes : relation.notes,
      },
    });
  }

  async deleteRelation(relationId: string, userId: string) {
    const relation = await this.prisma.relation.findUniqueOrThrow({ where: { id: relationId } });
    await this.assertGameOwner(relation.gameId, userId);
    return this.prisma.relation.delete({ where: { id: relationId } });
  }
}
