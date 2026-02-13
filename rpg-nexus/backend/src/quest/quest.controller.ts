import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestService } from './quest.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateQuestDto,
  UpdateQuestDto,
  CreateQuestStepDto,
  UpdateQuestStepDto,
  CreateQuestAssignmentDto,
  CreateQuestRewardDto,
} from './dto/quest.dto';

@Controller('quest')
@UseGuards(JwtAuthGuard)
export class QuestController {
  constructor(
    private questService: QuestService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromQuest(questId: string): Promise<string> {
    const quest = await this.prisma.quest.findUniqueOrThrow({ where: { id: questId }, select: { gameId: true } });
    return quest.gameId;
  }

  private async getGameIdFromStep(stepId: string): Promise<string> {
    const step = await this.prisma.questStep.findUniqueOrThrow({ where: { id: stepId }, include: { quest: { select: { gameId: true } } } });
    return step.quest.gameId;
  }

  private async getGameIdFromAssignment(assignmentId: string): Promise<string> {
    const a = await this.prisma.questAssignment.findUniqueOrThrow({ where: { id: assignmentId }, include: { quest: { select: { gameId: true } } } });
    return a.quest.gameId;
  }

  private async getGameIdFromReward(rewardId: string): Promise<string> {
    const r = await this.prisma.questReward.findUniqueOrThrow({ where: { id: rewardId }, include: { quest: { select: { gameId: true } } } });
    return r.quest.gameId;
  }

  @Get('game/:gameId')
  async getQuestsByGame(@Param('gameId') gameId: string) {
    return this.questService.getQuestsByGame(gameId);
  }

  @Get('game/:gameId/player')
  async getPlayerQuests(@Param('gameId') gameId: string, @Request() req) {
    return this.questService.getPlayerQuests(gameId, req.user.sub || req.user.id);
  }

  @Get(':questId')
  async getQuestById(@Param('questId') questId: string) {
    return this.questService.getQuestById(questId);
  }

  @Post('game/:gameId')
  async createQuest(@Param('gameId') gameId: string, @Body() dto: CreateQuestDto) {
    const result = await this.questService.createQuest(gameId, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Put(':questId')
  async updateQuest(@Param('questId') questId: string, @Body() dto: UpdateQuestDto) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.updateQuest(questId, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Delete(':questId')
  async deleteQuest(@Param('questId') questId: string) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.deleteQuest(questId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Post(':questId/step')
  async addStep(@Param('questId') questId: string, @Body() dto: CreateQuestStepDto) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.addStep(questId, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Put('step/:stepId')
  async updateStep(@Param('stepId') stepId: string, @Body() dto: UpdateQuestStepDto) {
    const gameId = await this.getGameIdFromStep(stepId);
    const result = await this.questService.updateStep(stepId, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Delete('step/:stepId')
  async deleteStep(@Param('stepId') stepId: string) {
    const gameId = await this.getGameIdFromStep(stepId);
    const result = await this.questService.deleteStep(stepId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Put('step/:stepId/toggle')
  async toggleStep(@Param('stepId') stepId: string) {
    const gameId = await this.getGameIdFromStep(stepId);
    const result = await this.questService.toggleStep(stepId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Post(':questId/assignment')
  async addAssignment(@Param('questId') questId: string, @Body() dto: CreateQuestAssignmentDto) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.addAssignment(questId, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Delete('assignment/:assignmentId')
  async removeAssignment(@Param('assignmentId') assignmentId: string) {
    const gameId = await this.getGameIdFromAssignment(assignmentId);
    const result = await this.questService.removeAssignment(assignmentId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Post(':questId/reward')
  async addReward(@Param('questId') questId: string, @Body() dto: CreateQuestRewardDto) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.addReward(questId, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Delete('reward/:rewardId')
  async removeReward(@Param('rewardId') rewardId: string) {
    const gameId = await this.getGameIdFromReward(rewardId);
    const result = await this.questService.removeReward(rewardId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Post(':questId/complete')
  async completeQuest(@Param('questId') questId: string) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.completeQuest(questId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Post(':questId/fail')
  async failQuest(@Param('questId') questId: string) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.failQuest(questId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }

  @Post(':questId/reactivate')
  async reactivateQuest(@Param('questId') questId: string) {
    const gameId = await this.getGameIdFromQuest(questId);
    const result = await this.questService.reactivateQuest(questId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'quest');
    return result;
  }
}
