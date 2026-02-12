// 📍 Fichier : backend/src/custom-model/custom-model.service.ts
// 🎯 Rôle : Logique métier pour les templates de personnages
// 💡 CRUD avec validation et permissions + LOGS DE DEBUG

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomModelDto, UpdateCustomModelDto } from './dto/custom-model.dto';

@Injectable()
export class CustomModelService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════

  async create(userId: string, dto: CreateCustomModelDto) {
    console.log('═══════════════════════════════════════');
    console.log('🔍 DÉBUT create');
    console.log('userId reçu:', userId);
    console.log('gameId reçu:', dto.gameId);

    // Vérifie que l'utilisateur est propriétaire de la partie
    const game = await this.prisma.game.findUnique({
      where: { id: dto.gameId },
    });

    console.log('game trouvé?', game ? 'OUI' : 'NON');

    if (!game) {
      console.log('❌ ERREUR: Partie introuvable');
      throw new NotFoundException('Partie introuvable');
    }

    console.log('ownerId de la partie:', game.ownerId);
    console.log('userId === ownerId?', game.ownerId === userId);

    if (game.ownerId !== userId) {
      console.log('❌ ERREUR: Seul le MJ peut créer des templates');
      console.log('═══════════════════════════════════════');
      throw new ForbiddenException('Seul le MJ peut créer des templates');
    }

    console.log('✅ Création autorisée !');

    // Crée le template
    const customModel = await this.prisma.customModel.create({
      data: {
        name: dto.name,
        description: dto.description,
        schema: dto.schema,
        gameId: dto.gameId,
      },
    });

    console.log('✅ Template créé avec succès, ID:', customModel.id);
    console.log('═══════════════════════════════════════');

    return customModel;
  }

  // ═══════════════════════════════════════════════════════
  // READ
  // ═══════════════════════════════════════════════════════

  async findAllByGame(userId: string, gameId: string) {
    console.log('═══════════════════════════════════════');
    console.log('🔍 DÉBUT findAllByGame');
    console.log('userId reçu:', userId);
    console.log('gameId reçu:', gameId);

    // Vérifie l'accès à la partie
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
      },
    });

    console.log('game trouvé?', game ? 'OUI' : 'NON');

    if (!game) {
      console.log('❌ ERREUR: Partie introuvable');
      console.log('═══════════════════════════════════════');
      throw new NotFoundException('Partie introuvable');
    }

    console.log('ownerId de la partie:', game.ownerId);
    console.log('Nombre de players:', game.players.length);

    const isOwner = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);

    console.log('Est owner?', isOwner);
    console.log('Est player?', isPlayer);

    if (!isOwner && !isPlayer) {
      console.log('❌ ERREUR: Pas d\'accès à la partie');
      console.log('═══════════════════════════════════════');
      throw new ForbiddenException('Vous n\'avez pas accès à cette partie');
    }

    console.log('✅ Accès autorisé !');

    // Récupère tous les templates de la partie
    const models = await this.prisma.customModel.findMany({
      where: { gameId },
      include: {
        _count: {
          select: { characters: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('✅ Templates récupérés:', models.length);
    console.log('═══════════════════════════════════════');

    return models;
  }

  async findOne(userId: string, modelId: string) {
    const model = await this.prisma.customModel.findUnique({
      where: { id: modelId },
      include: {
        game: {
          include: {
            players: true,
          },
        },
        characters: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('Template introuvable');
    }

    // Vérifie les permissions
    const isOwner = model.game.ownerId === userId;
    const isPlayer = model.game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce template');
    }

    return model;
  }

  // ═══════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════

  async update(userId: string, modelId: string, dto: UpdateCustomModelDto) {
    const model = await this.prisma.customModel.findUnique({
      where: { id: modelId },
      include: {
        game: true,
      },
    });

    if (!model) {
      throw new NotFoundException('Template introuvable');
    }

    // Seul le MJ peut modifier
    if (model.game.ownerId !== userId) {
      throw new ForbiddenException('Seul le MJ peut modifier les templates');
    }

    // Met à jour le template
    const updated = await this.prisma.customModel.update({
      where: { id: modelId },
      data: {
        name: dto.name,
        description: dto.description,
        schema: dto.schema,
      },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════

  async remove(userId: string, modelId: string) {
    const model = await this.prisma.customModel.findUnique({
      where: { id: modelId },
      include: {
        game: true,
        _count: {
          select: { characters: true },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('Template introuvable');
    }

    // Seul le MJ peut supprimer
    if (model.game.ownerId !== userId) {
      throw new ForbiddenException('Seul le MJ peut supprimer les templates');
    }

    // Avertissement si des personnages utilisent ce template
    if (model._count.characters > 0) {
      throw new ForbiddenException(
        `Ce template est utilisé par ${model._count.characters} personnage(s). Supprimez-les d'abord ou détachez-les du template.`,
      );
    }

    await this.prisma.customModel.delete({
      where: { id: modelId },
    });

    return { message: 'Template supprimé avec succès' };
  }

  // ═══════════════════════════════════════════════════════
  // MÉTHODE UTILITAIRE - Générer un schéma par défaut
  // ═══════════════════════════════════════════════════════

  getDefaultSchema() {
    return {
      stats: {
        Force: { type: 'number', default: 10, min: 1, max: 20 },
        Dextérité: { type: 'number', default: 10, min: 1, max: 20 },
        Constitution: { type: 'number', default: 10, min: 1, max: 20 },
      },
      fields: {
        Race: {
          type: 'select',
          options: ['Humain', 'Elfe', 'Nain', 'Orque'],
          required: false,
        },
        Classe: {
          type: 'text',
          required: false,
        },
      },
    };
  }
}