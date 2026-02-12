// backend/src/dice/dice.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiceService {
  constructor(private prisma: PrismaService) {}

  // Sauvegarder un jet de dés
  async saveDiceRoll(data: {
    gameId: string;
    userId: string;
    username: string;
    formula: string;
    diceType: number;
    count: number;
    modifier: number;
    results: number[];
    total: number;
    reason?: string;
    advantage?: boolean;
    disadvantage?: boolean;
  }) {
    return this.prisma.diceRoll.create({
      data: {
        gameId: data.gameId,
        userId: data.userId,
        username: data.username,
        formula: data.formula,
        diceType: data.diceType,
        count: data.count,
        modifier: data.modifier,
        results: data.results,
        total: data.total,
        reason: data.reason,
        advantage: data.advantage || false,
        disadvantage: data.disadvantage || false,
      },
    });
  }

  // Récupérer tous les jets d'une partie
  async getGameDiceRolls(gameId: string) {
    return this.prisma.diceRoll.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limite aux 50 derniers
    });
  }

  // Récupérer les statistiques d'un joueur dans une partie
  async getPlayerStats(gameId: string, userId: string) {
    const rolls = await this.prisma.diceRoll.findMany({
      where: {
        gameId,
        userId,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (rolls.length === 0) {
      return {
        totalRolls: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        criticalSuccesses: 0,
        criticalFailures: 0,
        distribution: {},
        recentRolls: [],
      };
    }

    // Calculs statistiques
    const totals = rolls.map((r) => r.total);
    const sum = totals.reduce((a, b) => a + b, 0);
    const average = Math.round((sum / totals.length) * 100) / 100;
    const highest = Math.max(...totals);
    const lowest = Math.min(...totals);

    // Critiques (seulement pour les d20)
    const d20Rolls = rolls.filter((r) => r.diceType === 20 && r.count === 1);
    const criticalSuccesses = d20Rolls.filter((r) => {
      const results = r.results as number[];
      return results[0] === 20;
    }).length;
    const criticalFailures = d20Rolls.filter((r) => {
      const results = r.results as number[];
      return results[0] === 1;
    }).length;

    // Distribution par type de dé
    const distribution = {};
    rolls.forEach((roll) => {
      const key = `d${roll.diceType}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });

    // Jets récents (10 derniers)
    const recentRolls = rolls.slice(-10).reverse();

    return {
      totalRolls: rolls.length,
      average,
      highest,
      lowest,
      criticalSuccesses,
      criticalFailures,
      distribution,
      recentRolls: recentRolls.map((r) => ({
        formula: r.formula,
        total: r.total,
        results: r.results,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
    };
  }

  // Récupérer les statistiques globales d'une partie
  async getGameStats(gameId: string) {
    const rolls = await this.prisma.diceRoll.findMany({
      where: { gameId },
      orderBy: { createdAt: 'asc' },
    });

    if (rolls.length === 0) {
      return {
        totalRolls: 0,
        playerStats: {},
        mostActivePlayer: null,
        highestRoll: null,
        lowestRoll: null,
      };
    }

    // Stats par joueur
    const playerStats = {};
    rolls.forEach((roll) => {
      if (!playerStats[roll.userId]) {
        playerStats[roll.userId] = {
          username: roll.username,
          count: 0,
          total: 0,
        };
      }
      playerStats[roll.userId].count += 1;
      playerStats[roll.userId].total += roll.total;
    });

    // Joueur le plus actif
    const mostActivePlayer = Object.values(playerStats).sort(
      (a: any, b: any) => b.count - a.count,
    )[0] as any;

    // Jet le plus haut/bas
    const sortedByTotal = [...rolls].sort((a, b) => b.total - a.total);
    const highestRoll = sortedByTotal[0];
    const lowestRoll = sortedByTotal[sortedByTotal.length - 1];

    return {
      totalRolls: rolls.length,
      playerStats,
      mostActivePlayer: mostActivePlayer
        ? {
            username: mostActivePlayer.username,
            count: mostActivePlayer.count,
          }
        : null,
      highestRoll: highestRoll
        ? {
            username: highestRoll.username,
            formula: highestRoll.formula,
            total: highestRoll.total,
          }
        : null,
      lowestRoll: lowestRoll
        ? {
            username: lowestRoll.username,
            formula: lowestRoll.formula,
            total: lowestRoll.total,
          }
        : null,
    };
  }
}
