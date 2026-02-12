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
}