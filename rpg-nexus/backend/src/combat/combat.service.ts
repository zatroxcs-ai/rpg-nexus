import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CombatService {
  constructor(private prisma: PrismaService) {}

  private mod(stat: number): number {
    return Math.floor((stat - 10) / 2);
  }

  private rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }

  private rollD100(): number {
    return Math.floor(Math.random() * 100) + 1;
  }

  private rollDice(count: number, sides: number): number[] {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
  }

  private parseDamageFormula(formula: string): { count: number; sides: number; modifier: number } {
    const match = formula.trim().toLowerCase().match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return { count: 1, sides: 4, modifier: 0 };
    return {
      count: parseInt(match[1]),
      sides: parseInt(match[2]),
      modifier: match[3] ? parseInt(match[3]) : 0,
    };
  }

  private async assertGameOwner(gameId: string, userId: string) {
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut gérer les combats');
    return game;
  }

  async getActiveCombats(gameId: string) {
    return this.prisma.combat.findMany({
      where: { gameId, status: 'ACTIVE' },
      include: {
        participants: { orderBy: [{ sortOrder: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllCombats(gameId: string) {
    return this.prisma.combat.findMany({
      where: { gameId },
      include: {
        participants: { orderBy: [{ sortOrder: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFinishedCombats(gameId: string) {
    return this.prisma.combat.findMany({
      where: { gameId, status: 'FINISHED' },
      include: {
        participants: { orderBy: [{ sortOrder: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCombat(gameId: string, userId: string, data: { name?: string }) {
    await this.assertGameOwner(gameId, userId);

    return this.prisma.combat.create({
      data: {
        gameId,
        name: data.name || 'Combat',
        status: 'ACTIVE',
        currentTurn: 0,
        round: 1,
        log: [],
      },
      include: { participants: true },
    });
  }

  async addCharacterToCombat(combatId: string, userId: string, characterId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: true },
    });
    await this.assertGameOwner(combat.gameId, userId);

    const character = await this.prisma.character.findUniqueOrThrow({
      where: { id: characterId },
      include: { owner: { select: { username: true } } },
    });

    const charData = character.data as any || {};

    const stats = {
      strength: charData['FOR'] ?? 10,
      dexterity: charData['DEX'] ?? 10,
      constitution: charData['CON'] ?? 10,
      intelligence: charData['INT'] ?? 10,
      wisdom: charData['SAG'] ?? 10,
      charisma: charData['CHA'] ?? 10,
    };

    const dexMod = this.mod(stats.dexterity);
    const initiativeRoll = this.rollD20();
    const initiative = initiativeRoll + dexMod;

    const participant = await this.prisma.combatParticipant.create({
      data: {
        combatId,
        type: 'CHARACTER',
        characterId: character.id,
        name: character.name,
        avatar: character.avatar,
        initiative,
        hp: charData['HP'] ?? 10,
        maxHp: charData['HP Max'] ?? 10,
        ac: charData['CA'] ?? 10,
        ...stats,
        speed: charData['Vitesse'] ?? 30,
        actions: charData['_actions'] ?? [],
        conditions: [],
        isAlive: true,
        sortOrder: 0,
      },
    });

    await this.recalculateOrder(combatId);

    return {
      participant,
      initiativeRoll,
      dexMod,
      total: initiative,
    };
  }

  async addMonsterToCombat(combatId: string, userId: string, monsterId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: true },
    });
    await this.assertGameOwner(combat.gameId, userId);

    const monster = await this.prisma.monster.findUniqueOrThrow({ where: { id: monsterId } });

    const dexMod = this.mod(monster.dexterity ?? 10);
    const initiativeRoll = this.rollD20();
    const initiative = initiativeRoll + dexMod;

    const participant = await this.prisma.combatParticipant.create({
      data: {
        combatId,
        type: 'MONSTER',
        monsterId: monster.id,
        name: monster.name,
        avatar: monster.avatar,
        initiative,
        hp: monster.hp ?? 10,
        maxHp: monster.maxHp ?? 10,
        ac: monster.ac ?? 10,
        strength: monster.strength ?? 10,
        dexterity: monster.dexterity ?? 10,
        constitution: monster.constitution ?? 10,
        intelligence: monster.intelligence ?? 10,
        wisdom: monster.wisdom ?? 10,
        charisma: monster.charisma ?? 10,
        speed: monster.speed ?? 30,
        actions: monster.actions ?? [],
        conditions: [],
        isAlive: true,
        sortOrder: 0,
      },
    });

    await this.recalculateOrder(combatId);

    return {
      participant,
      initiativeRoll,
      dexMod,
      total: initiative,
    };
  }

  async removeParticipant(combatId: string, userId: string, participantId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    await this.prisma.combatParticipant.delete({ where: { id: participantId } });
    await this.recalculateOrder(combatId);

    return { success: true };
  }

  private async recalculateOrder(combatId: string) {
    const participants = await this.prisma.combatParticipant.findMany({
      where: { combatId },
      orderBy: [{ initiative: 'desc' }, { dexterity: 'desc' }],
    });

    for (let i = 0; i < participants.length; i++) {
      await this.prisma.combatParticipant.update({
        where: { id: participants[i].id },
        data: { sortOrder: i },
      });
    }
  }

  async toggleAutoMode(combatId: string, userId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    return this.prisma.combat.update({
      where: { id: combatId },
      data: { autoMode: !combat.autoMode },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async nextTurn(combatId: string, userId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { where: { isAlive: true }, orderBy: [{ sortOrder: 'asc' }] } },
    });
    await this.assertGameOwner(combat.gameId, userId);

    if (combat.participants.length === 0) throw new BadRequestException('Aucun participant vivant');

    let nextTurnIdx = combat.currentTurn + 1;
    let nextRound = combat.round;

    if (nextTurnIdx >= combat.participants.length) {
      nextTurnIdx = 0;
      nextRound += 1;
    }

    await this.prisma.combat.update({
      where: { id: combatId },
      data: { currentTurn: nextTurnIdx, round: nextRound },
    });

    const autoAttacks: any[] = [];

    if (combat.autoMode) {
      let currentIdx = nextTurnIdx;
      let currentRound = nextRound;

      while (true) {
        const freshCombat = await this.prisma.combat.findUniqueOrThrow({
          where: { id: combatId },
          include: { participants: { where: { isAlive: true }, orderBy: [{ sortOrder: 'asc' }] } },
        });

        const aliveCount = freshCombat.participants.length;
        if (aliveCount < 2) break;

        // Clamp currentIdx aux bounds actuels
        if (currentIdx >= aliveCount) {
          currentIdx = 0;
          currentRound += 1;
          await this.prisma.combat.update({
            where: { id: combatId },
            data: { currentTurn: currentIdx, round: currentRound },
          });
        }

        const current = freshCombat.participants[currentIdx];
        if (!current || current.type !== 'MONSTER') break;

        const targets = freshCombat.participants.filter(p => p.type === 'CHARACTER' && p.id !== current.id);
        if (targets.length === 0) break;

        const target = targets[Math.floor(Math.random() * targets.length)];
        const actions = current.actions as any[];
        const actionIndex = actions.length > 0 ? Math.floor(Math.random() * actions.length) : 0;

        try {
          const result = await this.executeAttack(combatId, current, target, actionIndex, currentRound);
          autoAttacks.push(result.attackResult);
        } catch (err) {
          console.error('[AUTO-COMBAT] executeAttack error:', err?.message || err);
          break;
        }

        currentIdx += 1;
        const afterCount = await this.prisma.combatParticipant.count({ where: { combatId, isAlive: true } });
        if (currentIdx >= afterCount) {
          currentIdx = 0;
          currentRound += 1;
        }

        await this.prisma.combat.update({
          where: { id: combatId },
          data: { currentTurn: currentIdx, round: currentRound },
        });
      }
    }

    const updated = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    return { ...updated, autoAttacks };
  }

  private async executeAttack(
    combatId: string,
    attacker: any,
    target: any,
    actionIndex: number,
    round: number,
  ) {
    let actions = attacker.actions as any[];
    if (!actions || actions.length === 0) {
      if (attacker.characterId) {
        const char = await this.prisma.character.findUnique({ where: { id: attacker.characterId } });
        const charData = char?.data as any || {};
        actions = charData['_actions'] ?? [];
      } else if (attacker.monsterId) {
        const mon = await this.prisma.monster.findUnique({ where: { id: attacker.monsterId } });
        actions = (mon?.actions as any[]) ?? [];
      }
    }
    const action = actions?.[actionIndex];
    const actionName = action?.name || 'Attaque';
    const damageFormula = action?.damage || '1d4';
    const successRate: number = action?.successRate ?? 50;

    const attackRoll = this.rollD100();
    const isCritical = attackRoll <= 5;
    const isFumble = attackRoll >= 96;
    const hits = isCritical || (!isFumble && attackRoll <= successRate);

    let damageTotal = 0;
    let damageRolls: number[] = [];

    if (hits) {
      const parsed = this.parseDamageFormula(damageFormula);
      const diceCount = isCritical ? parsed.count * 2 : parsed.count;
      damageRolls = this.rollDice(diceCount, parsed.sides);
      damageTotal = damageRolls.reduce((a, b) => a + b, 0) + parsed.modifier;
      if (damageTotal < 1) damageTotal = 1;

      const newHp = Math.max(0, target.hp - damageTotal);
      const isDead = newHp <= 0;

      await this.prisma.combatParticipant.update({
        where: { id: target.id },
        data: { hp: newHp, isAlive: !isDead },
      });
    }

    const logEntry = {
      type: 'attack',
      auto: true,
      round,
      attackerName: attacker.name,
      targetName: target.name,
      actionName,
      attackRoll,
      successRate,
      hits,
      isCritical,
      isFumble,
      damageFormula,
      damageRolls,
      damageTotal: hits ? damageTotal : 0,
      targetHpAfter: hits ? Math.max(0, target.hp - damageTotal) : target.hp,
      targetDied: hits && (target.hp - damageTotal) <= 0,
      timestamp: new Date().toISOString(),
    };

    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    const currentLog = combat.log as any[] || [];
    await this.prisma.combat.update({
      where: { id: combatId },
      data: { log: [...currentLog, logEntry] },
    });

    return { attackResult: logEntry };
  }

  async performAttack(
    combatId: string,
    userId: string,
    data: { attackerId: string; targetId: string; actionIndex?: number },
  ) {
    const combat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
    await this.assertGameOwner(combat.gameId, userId);

    const attacker = combat.participants.find(p => p.id === data.attackerId);
    const target = combat.participants.find(p => p.id === data.targetId);

    if (!attacker || !target) throw new NotFoundException('Participant introuvable');
    if (!attacker.isAlive) throw new BadRequestException("L'attaquant est mort");
    if (!target.isAlive) throw new BadRequestException('La cible est déjà morte');

    const result = await this.executeAttack(combatId, attacker, target, data.actionIndex ?? 0, combat.round);

    const updatedCombat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    return { combat: updatedCombat, attackResult: result.attackResult };
  }

  async applyDamage(combatId: string, userId: string, data: { targetId: string; amount: number }) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    const target = await this.prisma.combatParticipant.findUniqueOrThrow({ where: { id: data.targetId } });
    const newHp = Math.max(0, Math.min(target.maxHp, target.hp - data.amount));

    await this.prisma.combatParticipant.update({
      where: { id: data.targetId },
      data: { hp: newHp, isAlive: newHp > 0 },
    });

    return this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async healParticipant(combatId: string, userId: string, data: { targetId: string; amount: number }) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    const target = await this.prisma.combatParticipant.findUniqueOrThrow({ where: { id: data.targetId } });
    const newHp = Math.min(target.maxHp, target.hp + data.amount);

    await this.prisma.combatParticipant.update({
      where: { id: data.targetId },
      data: { hp: newHp, isAlive: true },
    });

    return this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async updateInitiative(combatId: string, userId: string, data: { participantId: string; initiative: number }) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    await this.prisma.combatParticipant.update({
      where: { id: data.participantId },
      data: { initiative: data.initiative },
    });

    await this.recalculateOrder(combatId);

    return this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async endCombat(combatId: string, userId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    return this.prisma.combat.update({
      where: { id: combatId },
      data: { status: 'FINISHED' },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  async updateConditions(combatId: string, userId: string, data: { participantId: string; conditions: string[] }) {
    const combat = await this.prisma.combat.findUniqueOrThrow({ where: { id: combatId } });
    await this.assertGameOwner(combat.gameId, userId);

    await this.prisma.combatParticipant.update({
      where: { id: data.participantId },
      data: { conditions: data.conditions },
    });

    return this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
  }

  private async assertPlayerOwnsParticipant(combatId: string, userId: string, participantId: string) {
    const combat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    const participant = combat.participants.find(p => p.id === participantId);
    if (!participant) throw new NotFoundException('Participant introuvable');
    if (!participant.characterId) throw new ForbiddenException('Seuls les personnages joueurs peuvent agir');

    const character = await this.prisma.character.findUniqueOrThrow({
      where: { id: participant.characterId },
    });
    if (character.ownerId !== userId) throw new ForbiddenException('Ce personnage ne vous appartient pas');

    const aliveParticipants = combat.participants.filter(p => p.isAlive);
    const currentParticipant = aliveParticipants[combat.currentTurn];
    if (!currentParticipant || currentParticipant.id !== participantId) {
      throw new BadRequestException("Ce n'est pas votre tour");
    }

    return { combat, participant };
  }

  private async advanceTurn(combatId: string): Promise<any[]> {
    const autoAttacks: any[] = [];
    const combat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });
    const aliveParticipants = combat.participants.filter(p => p.isAlive);
    if (aliveParticipants.length === 0) return autoAttacks;
    let nextTurnIdx = combat.currentTurn + 1;
    let nextRound = combat.round;
    if (nextTurnIdx >= aliveParticipants.length) {
      nextTurnIdx = 0;
      nextRound += 1;
    }
    await this.prisma.combat.update({
      where: { id: combatId },
      data: { currentTurn: nextTurnIdx, round: nextRound },
    });

    if (combat.autoMode) {
      let currentIdx = nextTurnIdx;
      let currentRound = nextRound;
      while (true) {
        const freshCombat = await this.prisma.combat.findUniqueOrThrow({
          where: { id: combatId },
          include: { participants: { where: { isAlive: true }, orderBy: [{ sortOrder: 'asc' }] } },
        });
        const aliveCount = freshCombat.participants.length;
        if (aliveCount < 2) break;

        // Clamp currentIdx aux bounds actuels (un participant a pu mourir entre-temps)
        if (currentIdx >= aliveCount) {
          currentIdx = 0;
          currentRound += 1;
          await this.prisma.combat.update({
            where: { id: combatId },
            data: { currentTurn: currentIdx, round: currentRound },
          });
        }

        const current = freshCombat.participants[currentIdx];
        if (!current || current.type !== 'MONSTER') break;

        const targets = freshCombat.participants.filter(p => p.type === 'CHARACTER' && p.id !== current.id);
        if (targets.length === 0) break;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const monActions = current.actions as any[];
        const actionIndex = monActions.length > 0 ? Math.floor(Math.random() * monActions.length) : 0;
        try {
          const result = await this.executeAttack(combatId, current, target, actionIndex, currentRound);
          autoAttacks.push(result.attackResult);
        } catch (err) {
          console.error('[ADVANCE-AUTO] executeAttack error:', err?.message || err);
          break;
        }

        currentIdx += 1;
        // Refetch count après l'attaque (la cible a pu mourir)
        const afterCount = await this.prisma.combatParticipant.count({ where: { combatId, isAlive: true } });
        if (currentIdx >= afterCount) {
          currentIdx = 0;
          currentRound += 1;
        }
        await this.prisma.combat.update({
          where: { id: combatId },
          data: { currentTurn: currentIdx, round: currentRound },
        });
      }
    }

    return autoAttacks;
  }

  async playerAttack(
    combatId: string,
    userId: string,
    data: { participantId: string; targetId: string; actionIndex?: number },
  ) {
    const { combat, participant } = await this.assertPlayerOwnsParticipant(combatId, userId, data.participantId);

    if (!participant.isAlive) throw new BadRequestException('Votre personnage est mort');

    const target = combat.participants.find(p => p.id === data.targetId);
    if (!target) throw new NotFoundException('Cible introuvable');
    if (!target.isAlive) throw new BadRequestException('La cible est deja morte');

    const result = await this.executeAttack(combatId, participant, target, data.actionIndex ?? 0, combat.round);

    const autoAttacks = await this.advanceTurn(combatId);

    const updatedCombat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    return { combat: updatedCombat, attackResult: result.attackResult, autoAttacks };
  }

  async playerFlee(combatId: string, userId: string, data: { participantId: string }) {
    const { combat, participant } = await this.assertPlayerOwnsParticipant(combatId, userId, data.participantId);

    if (!participant.isAlive) throw new BadRequestException('Votre personnage est mort');

    const dexMod = this.mod(participant.dexterity ?? 10);
    const fleeRoll = this.rollD20();
    const fleeTotal = fleeRoll + dexMod;
    const dc = 10;
    const success = fleeTotal >= dc;

    const logEntry = {
      type: 'flee',
      round: combat.round,
      attackerName: participant.name,
      targetName: null,
      actionName: 'Tentative de fuite',
      fleeRoll,
      dexMod,
      fleeTotal,
      dc,
      success,
      // Champs aliasés pour que le frontend puisse afficher le résultat uniformément
      attackRoll: fleeRoll,
      successRate: (21 - dc) * 5, // DC10 → 55%, DC15 → 30%, etc.
      hits: success,
      timestamp: new Date().toISOString(),
    };

    const currentLog = combat.log as any[] || [];
    await this.prisma.combat.update({
      where: { id: combatId },
      data: { log: [...currentLog, logEntry] },
    });

    if (success) {
      await this.prisma.combatParticipant.delete({ where: { id: participant.id } });
      await this.recalculateOrder(combatId);
    }

    const autoAttacks = await this.advanceTurn(combatId);

    const updatedCombat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    return { combat: updatedCombat, fleeResult: logEntry, autoAttacks };
  }

  async playerEndTurn(combatId: string, userId: string, data: { participantId: string }) {
    await this.assertPlayerOwnsParticipant(combatId, userId, data.participantId);

    const autoAttacks = await this.advanceTurn(combatId);

    const updatedCombat = await this.prisma.combat.findUniqueOrThrow({
      where: { id: combatId },
      include: { participants: { orderBy: [{ sortOrder: 'asc' }] } },
    });

    return { ...updatedCombat, autoAttacks };
  }
}
