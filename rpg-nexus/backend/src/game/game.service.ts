// 📍 Fichier : backend/src/game/game.service.ts
// 🎯 Rôle : Contient TOUTE la logique pour gérer les parties de jeu
// 💡 CRUD complet : Create, Read, Update, Delete + Gestion des joueurs

import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  // 📝 Créer une nouvelle partie (ADMIN uniquement)
  async createGame(userId: string, createGameDto: CreateGameDto) {
    const game = await this.prisma.game.create({
      data: {
        name: createGameDto.name,
        description: createGameDto.description,
        coverImage: createGameDto.coverImage,
        customStyles: createGameDto.customStyles || {},
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: { players: true },
        },
      },
    });

    return {
      ...game,
      playersCount: game._count.players,
    };
  }

  // 📋 Récupérer toutes les parties d'un MJ
  async getGamesByOwner(userId: string) {
    const games = await this.prisma.game.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: { players: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return games.map((game) => ({
      ...game,
      playersCount: game._count.players,
    }));
  }

  // 📋 Récupérer les parties où un joueur est invité
  async getGamesForPlayer(userId: string) {
    const gamePlayerRecords = await this.prisma.gamePlayer.findMany({
      where: { playerId: userId },
      include: {
        game: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
              },
            },
            _count: {
              select: { players: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return gamePlayerRecords.map((record) => ({
      ...record.game,
      playersCount: record.game._count.players,
      joinedAt: record.joinedAt,
    }));
  }

  // 🔍 Récupérer une partie par son ID
  async getGameById(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        players: {
          include: {
            player: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        characters: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    // Vérifie que l'utilisateur a accès (propriétaire OU joueur invité)
    const isOwner = game.ownerId === userId;
    const isPlayer = game.players.some((p) => p.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException('Accès refusé à cette partie');
    }

    return game;
  }

  // ✏️ Mettre à jour une partie (ADMIN uniquement)
  async updateGame(gameId: string, userId: string, updateGameDto: UpdateGameDto) {
    // Vérifie que la partie existe et appartient à l'utilisateur
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    if (game.ownerId !== userId) {
      throw new ForbiddenException('Seul le créateur peut modifier cette partie');
    }

    // Prépare les données à mettre à jour
    const updateData: any = {};
    
    if (updateGameDto.name !== undefined) updateData.name = updateGameDto.name;
    if (updateGameDto.description !== undefined) updateData.description = updateGameDto.description;
    if (updateGameDto.coverImage !== undefined) updateData.coverImage = updateGameDto.coverImage;
    if (updateGameDto.isActive !== undefined) updateData.isActive = updateGameDto.isActive;
    
    // Gestion spéciale de customStyles (fusion avec l'ancien)
    if (updateGameDto.customStyles) {
      const existingStyles = game.customStyles as object || {};
      updateData.customStyles = { ...existingStyles, ...updateGameDto.customStyles };
    }

    // Met à jour
    const updatedGame = await this.prisma.game.update({
      where: { id: gameId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: { players: true },
        },
      },
    });

    return {
      ...updatedGame,
      playersCount: updatedGame._count.players,
    };
  }

  // 🗑️ Supprimer une partie (ADMIN uniquement)
  async deleteGame(gameId: string, userId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    if (game.ownerId !== userId) {
      throw new ForbiddenException('Seul le créateur peut supprimer cette partie');
    }

    await this.prisma.game.delete({
      where: { id: gameId },
    });

    return { message: 'Partie supprimée avec succès' };
  }

  // 👥 Inviter un joueur à une partie
  async invitePlayer(gameId: string, ownerId: string, playerId: string) {
    // Vérifie que la partie existe et appartient au MJ
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    if (game.ownerId !== ownerId) {
      throw new ForbiddenException('Seul le créateur peut inviter des joueurs');
    }

    // Vérifie que le joueur existe
    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException('Joueur introuvable');
    }

    // Vérifie qu'il n'est pas déjà invité
    const existingInvite = await this.prisma.gamePlayer.findUnique({
      where: {
        gameId_playerId: {
          gameId,
          playerId,
        },
      },
    });

    if (existingInvite) {
      throw new ConflictException('Ce joueur est déjà dans la partie');
    }

    // Crée l'invitation
    await this.prisma.gamePlayer.create({
      data: {
        gameId,
        playerId,
      },
    });

    return { message: `${player.username} a été invité à la partie` };
  }

  // 🚪 Retirer un joueur d'une partie
  async removePlayer(gameId: string, ownerId: string, playerId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    if (game.ownerId !== ownerId) {
      throw new ForbiddenException('Seul le créateur peut retirer des joueurs');
    }

    await this.prisma.gamePlayer.delete({
      where: {
        gameId_playerId: {
          gameId,
          playerId,
        },
      },
    });

    return { message: 'Joueur retiré de la partie' };
  }

  async exportGame(userId: string, gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        characters: true,
        animations: true,
        assets: true,
        diceRolls: { take: 500, orderBy: { createdAt: 'desc' } },
        combats: { include: { participants: true } },
        monsters: true,
        notes: true,
        npcs: true,
        items: true,
        relations: true,
        tacticalMap: { include: { scenes: true } },
      },
    });

    if (!game) throw new NotFoundException('Partie introuvable');
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut exporter');

    return {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      game: {
        name: game.name,
        description: game.description,
        customStyles: game.customStyles,
      },
      characters: game.characters.map(c => ({ name: c.name, avatar: c.avatar, data: c.data })),
      animations: game.animations.map(a => ({ name: a.name, fileUrl: a.fileUrl, fileType: a.fileType, duration: a.duration, loop: a.loop, positionX: a.positionX, positionY: a.positionY, width: a.width, height: a.height })),
      monsters: game.monsters.map(m => ({ name: m.name, description: m.description, avatar: m.avatar, hp: m.hp, maxHp: m.maxHp, ac: m.ac, showStats: m.showStats, showHp: m.showHp, showAc: m.showAc, actions: m.actions, type: m.type, size: m.size, challengeRating: m.challengeRating })),
      npcs: game.npcs.map(n => ({ name: n.name, description: n.description, avatar: n.avatar, role: n.role, hp: n.hp, maxHp: n.maxHp, ac: n.ac, notes: n.notes, isVisible: n.isVisible, actions: n.actions, inventory: n.inventory })),
      items: game.items.map(it => ({ name: it.name, description: it.description, image: it.image, category: it.category, rarity: it.rarity, effects: it.effects, isConsumable: it.isConsumable, duration: it.duration, weight: it.weight, value: it.value })),
      notes: game.notes.map(n => ({ title: n.title, content: n.content, category: n.category, isPinned: n.isPinned, gameDate: n.gameDate })),
      relations: game.relations.map(r => ({ sourceId: r.sourceId, sourceType: r.sourceType, sourceName: r.sourceName, targetId: r.targetId, targetType: r.targetType, targetName: r.targetName, type: r.type, label: r.label, notes: r.notes })),
      combats: game.combats.map(c => ({ name: c.name, status: c.status, round: c.round, participants: c.participants.map(p => ({ name: p.name, type: p.type, initiative: p.initiative, hp: p.hp, maxHp: p.maxHp, ac: p.ac })) })),
      tacticalMap: game.tacticalMap ? {
        scenes: game.tacticalMap.scenes.map(s => ({
          name: s.name, gridWidth: s.gridWidth, gridHeight: s.gridHeight, gridSize: s.gridSize, gridColor: s.gridColor, gridOpacity: s.gridOpacity, backgroundColor: s.backgroundColor, backgroundImage: s.backgroundImage, backgroundOpacity: s.backgroundOpacity, cellUnit: s.cellUnit, tokens: s.tokens, drawings: s.drawings,
        })),
      } : null,
      diceRolls: game.diceRolls.map(d => ({ formula: d.formula, diceType: d.diceType, count: d.count, modifier: d.modifier, results: d.results, total: d.total, reason: d.reason, username: d.username, createdAt: d.createdAt })),
    };
  }

  async importGame(userId: string, gameId: string, importData: any) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Partie introuvable');
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut importer');

    let imported = { characters: 0, monsters: 0, npcs: 0, items: 0, notes: 0, relations: 0 };

    if (importData.characters?.length) {
      for (const c of importData.characters) {
        await this.prisma.character.create({
          data: { gameId, ownerId: userId, name: c.name, avatar: c.avatar || null, data: c.data || {} },
        });
      }
      imported.characters = importData.characters.length;
    }

    if (importData.monsters?.length) {
      for (const m of importData.monsters) {
        await this.prisma.monster.create({
          data: { gameId, name: m.name, description: m.description, avatar: m.avatar, hp: m.hp, maxHp: m.maxHp, ac: m.ac, showStats: m.showStats ?? false, showHp: m.showHp ?? false, showAc: m.showAc ?? false, actions: m.actions || [], type: m.type, size: m.size, challengeRating: m.challengeRating },
        });
      }
      imported.monsters = importData.monsters.length;
    }

    if (importData.npcs?.length) {
      for (const n of importData.npcs) {
        await this.prisma.npc.create({
          data: { gameId, name: n.name, description: n.description, avatar: n.avatar, role: n.role, hp: n.hp, maxHp: n.maxHp, ac: n.ac, notes: n.notes, isVisible: n.isVisible ?? true, actions: n.actions || [], inventory: n.inventory || [] },
        });
      }
      imported.npcs = importData.npcs.length;
    }

    if (importData.items?.length) {
      for (const it of importData.items) {
        await this.prisma.item.create({
          data: { gameId, name: it.name, description: it.description, image: it.image, category: it.category || 'divers', rarity: it.rarity || 'commun', effects: it.effects || [], isConsumable: it.isConsumable ?? false, duration: it.duration, weight: it.weight, value: it.value },
        });
      }
      imported.items = importData.items.length;
    }

    if (importData.notes?.length) {
      for (const n of importData.notes) {
        await this.prisma.note.create({
          data: { gameId, authorId: userId, title: n.title, content: n.content || '', category: n.category || 'session', isPinned: n.isPinned ?? false, gameDate: n.gameDate, participants: n.participants || [] },
        });
      }
      imported.notes = importData.notes.length;
    }

    if (importData.relations?.length) {
      for (const r of importData.relations) {
        await this.prisma.relation.create({
          data: { gameId, sourceType: r.sourceType, sourceId: r.sourceId || '', sourceName: r.sourceName, targetType: r.targetType, targetId: r.targetId || '', targetName: r.targetName, type: r.type || 'neutre', label: r.label, notes: r.notes },
        });
      }
      imported.relations = importData.relations.length;
    }

    return { message: 'Import reussi', imported };
  }
}