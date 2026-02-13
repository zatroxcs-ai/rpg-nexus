// 📍 Fichier : backend/src/character/character.service.ts
// 🎯 Rôle : Logique métier pour les personnages (ADAPTÉ AU SCHÉMA FLEXIBLE)
// 💡 CRUD complet avec système flexible basé sur CustomModel

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto, UpdateCharacterDto } from './dto/character.dto';

@Injectable()
export class CharacterService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════

  async create(userId: string, dto: CreateCharacterDto) {
    // Vérifie que l'utilisateur a accès à cette partie
    const game = await this.prisma.game.findUnique({
      where: { id: dto.gameId },
      include: {
        players: true, // GamePlayer relation
      },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    const isOwner = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette partie');
    }

    // Crée le personnage avec les données flexibles
    const character = await this.prisma.character.create({
      data: {
        name: dto.name,
        avatar: dto.avatar,
        data: dto.data || {},
        gameId: dto.gameId,
        ownerId: userId, // Le créateur est l'owner
        modelId: dto.modelId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        model: true,
      },
    });

    return character;
  }

  // ═══════════════════════════════════════════════════════
  // READ
  // ═══════════════════════════════════════════════════════

  async findAllByGame(userId: string, gameId: string) {
    // Vérifie l'accès à la partie
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
      },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    const isOwner = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette partie');
    }

    // Récupère tous les personnages de la partie
    const characters = await this.prisma.character.findMany({
      where: { gameId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        model: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return characters;
  }

  async findOne(userId: string, characterId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        game: {
          include: {
            players: true,
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        model: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Personnage introuvable');
    }

    // Vérifie les permissions
    const isOwner = character.game.ownerId === userId;
    const isPlayer = character.game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce personnage');
    }

    return character;
  }

  // ═══════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════

  async update(userId: string, characterId: string, dto: UpdateCharacterDto) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        game: {
          include: {
            players: true,
          },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Personnage introuvable');
    }

    // Vérifie les permissions
    const isGameOwner = character.game.ownerId === userId;
    const isCharacterOwner = character.ownerId === userId;

    if (!isGameOwner && !isCharacterOwner) {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce personnage');
    }

    // Met à jour le personnage
    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        name: dto.name,
        avatar: dto.avatar,
        data: dto.data,
        modelId: dto.modelId,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        model: true,
      },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════

  async remove(userId: string, characterId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        game: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Personnage introuvable');
    }

    // Seul le propriétaire de la partie ou du personnage peut supprimer
    const isGameOwner = character.game.ownerId === userId;
    const isCharacterOwner = character.ownerId === userId;

    if (!isGameOwner && !isCharacterOwner) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce personnage');
    }

    await this.prisma.character.delete({
      where: { id: characterId },
    });

    return { message: 'Personnage supprimé avec succès' };
  }
}
