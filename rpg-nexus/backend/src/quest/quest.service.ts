import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateQuestDto,
  UpdateQuestDto,
  CreateQuestStepDto,
  UpdateQuestStepDto,
  CreateQuestAssignmentDto,
  CreateQuestRewardDto,
} from './dto/quest.dto';

@Injectable()
export class QuestService {
  constructor(private prisma: PrismaService) {}

  private questInclude = {
    steps: { orderBy: { sortOrder: 'asc' as const } },
    assignments: true,
    rewards: true,
    childQuests: {
      include: {
        steps: { orderBy: { sortOrder: 'asc' as const } },
        assignments: true,
        rewards: true,
      },
      orderBy: { sortOrder: 'asc' as const },
    },
  };

  // ── Quests ────────────────────────────────────────────

  async getQuestsByGame(gameId: string) {
    return this.prisma.quest.findMany({
      where: { gameId },
      include: this.questInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getQuestById(questId: string) {
    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
      include: {
        ...this.questInclude,
        parentQuest: true,
      },
    });
    if (!quest) throw new NotFoundException('Quest not found');
    return quest;
  }

  async getPlayerQuests(gameId: string, userId: string) {
    // Find all characters owned by this user in this game
    const characters = await this.prisma.character.findMany({
      where: { gameId, ownerId: userId },
      select: { id: true },
    });

    const characterIds = characters.map((c) => c.id);

    const quests = await this.prisma.quest.findMany({
      where: {
        gameId,
        assignments: {
          some: {
            entityId: { in: characterIds },
          },
        },
        // Exclude HIDDEN quests entirely - only visible when MJ changes priority
        priority: { not: 'HIDDEN' },
      },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        assignments: true,
        rewards: true,
        childQuests: {
          include: {
            steps: { orderBy: { sortOrder: 'asc' } },
            assignments: true,
            rewards: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Strip gmNotes from results
    return quests.map((quest) => {
      const { gmNotes, childQuests, ...rest } = quest;
      return {
        ...rest,
        childQuests: childQuests
          .filter((c) => c.priority !== 'HIDDEN')
          .map(({ gmNotes: _, ...child }) => child),
      };
    });
  }

  async createQuest(gameId: string, dto: CreateQuestDto) {
    // Auto-set sortOrder to max + 1
    const maxSort = await this.prisma.quest.aggregate({
      where: { gameId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    return this.prisma.quest.create({
      data: {
        gameId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'ACTIVE',
        priority: dto.priority ?? 'MAIN',
        xpReward: dto.xpReward,
        deadline: dto.deadline,
        gmNotes: dto.gmNotes,
        parentQuestId: dto.parentQuestId || null,
        sortOrder,
      },
      include: this.questInclude,
    });
  }

  async updateQuest(questId: string, dto: UpdateQuestDto) {
    const existing = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!existing) throw new NotFoundException('Quest not found');

    return this.prisma.quest.update({
      where: { id: questId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.xpReward !== undefined && { xpReward: dto.xpReward }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline }),
        ...(dto.gmNotes !== undefined && { gmNotes: dto.gmNotes }),
        ...(dto.parentQuestId !== undefined && { parentQuestId: dto.parentQuestId || null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: this.questInclude,
    });
  }

  async deleteQuest(questId: string) {
    const existing = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!existing) throw new NotFoundException('Quest not found');

    await this.prisma.quest.delete({ where: { id: questId } });
    return { success: true };
  }

  // ── Steps ─────────────────────────────────────────────

  async addStep(questId: string, dto: CreateQuestStepDto) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    // Auto-set sortOrder to max + 1
    const maxSort = await this.prisma.questStep.aggregate({
      where: { questId },
      _max: { sortOrder: true },
    });
    const sortOrder = dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1;

    return this.prisma.questStep.create({
      data: {
        questId,
        title: dto.title,
        description: dto.description,
        sortOrder,
      },
    });
  }

  async updateStep(stepId: string, dto: UpdateQuestStepDto) {
    const step = await this.prisma.questStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Quest step not found');

    // Set completedAt when isCompleted becomes true
    let completedAt = step.completedAt;
    if (dto.isCompleted !== undefined) {
      completedAt = dto.isCompleted ? new Date() : null;
    }

    return this.prisma.questStep.update({
      where: { id: stepId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        completedAt,
      },
    });
  }

  async deleteStep(stepId: string) {
    const step = await this.prisma.questStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Quest step not found');

    await this.prisma.questStep.delete({ where: { id: stepId } });
    return { success: true };
  }

  async toggleStep(stepId: string) {
    const step = await this.prisma.questStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Quest step not found');

    const isCompleted = !step.isCompleted;
    const completedAt = isCompleted ? new Date() : null;

    return this.prisma.questStep.update({
      where: { id: stepId },
      data: { isCompleted, completedAt },
    });
  }

  // ── Assignments ───────────────────────────────────────

  async addAssignment(questId: string, dto: CreateQuestAssignmentDto) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    return this.prisma.questAssignment.create({
      data: {
        questId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        entityName: dto.entityName,
        entityAvatar: dto.entityAvatar,
      },
    });
  }

  async removeAssignment(assignmentId: string) {
    const assignment = await this.prisma.questAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Quest assignment not found');

    await this.prisma.questAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  }

  // ── Rewards ───────────────────────────────────────────

  async addReward(questId: string, dto: CreateQuestRewardDto) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    return this.prisma.questReward.create({
      data: {
        questId,
        itemId: dto.itemId,
        itemName: dto.itemName,
        itemImage: dto.itemImage,
        quantity: dto.quantity ?? 1,
      },
    });
  }

  async removeReward(rewardId: string) {
    const reward = await this.prisma.questReward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Quest reward not found');

    await this.prisma.questReward.delete({ where: { id: rewardId } });
    return { success: true };
  }

  // ── Status transitions ────────────────────────────────

  async completeQuest(questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    return this.prisma.quest.update({
      where: { id: questId },
      data: { status: 'COMPLETED' },
      include: this.questInclude,
    });
  }

  async failQuest(questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    return this.prisma.quest.update({
      where: { id: questId },
      data: { status: 'FAILED' },
      include: this.questInclude,
    });
  }

  async reactivateQuest(questId: string) {
    const quest = await this.prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) throw new NotFoundException('Quest not found');

    return this.prisma.quest.update({
      where: { id: questId },
      data: { status: 'ACTIVE' },
      include: this.questInclude,
    });
  }
}
