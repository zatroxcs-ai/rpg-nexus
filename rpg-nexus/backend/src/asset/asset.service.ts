// 📍 Fichier : backend/src/asset/asset.service.ts
// 🎯 Service de gestion des assets (fichiers)
// 💡 CRUD + vérification des permissions

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════
  // CREATE - Créer un asset
  // ═══════════════════════════════════════════════════════
  async create(userId: string, createAssetDto: CreateAssetDto) {
    // Vérifier que l'utilisateur a accès à la partie
    const game = await this.prisma.game.findUnique({
      where: { id: createAssetDto.gameId },
      include: { players: true },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    const isOwner = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException("Vous n'avez pas accès à cette partie");
    }

    return this.prisma.asset.create({
      data: {
        ...createAssetDto,
        uploaderId: userId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer tous les assets d'une partie
  // ═══════════════════════════════════════════════════════
  async findAllByGame(userId: string, gameId: string) {
    // Vérifier l'accès à la partie
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) {
      throw new NotFoundException('Partie introuvable');
    }

    const isOwner = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException("Vous n'avez pas accès à cette partie");
    }

    return this.prisma.asset.findMany({
      where: { gameId },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer un asset par ID
  // ═══════════════════════════════════════════════════════
  async findOne(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        game: { include: { players: true } },
        uploader: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset introuvable');
    }

    // Vérifier l'accès à la partie
    const isOwner = asset.game.ownerId === userId;
    const isPlayer = asset.game.players.some((gp) => gp.playerId === userId);

    if (!isOwner && !isPlayer) {
      throw new ForbiddenException("Vous n'avez pas accès à cet asset");
    }

    return asset;
  }

  // ═══════════════════════════════════════════════════════
  // DELETE - Supprimer un asset
  // ═══════════════════════════════════════════════════════
  async remove(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { game: true },
    });

    if (!asset) {
      throw new NotFoundException('Asset introuvable');
    }

    // Seul le MJ ou l'uploader peut supprimer
    const isOwner = asset.game.ownerId === userId;
    const isUploader = asset.uploaderId === userId;

    if (!isOwner && !isUploader) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer cet asset');
    }

    // Supprimer le fichier physique
    const filepath = path.join(
      process.cwd(),
      'uploads',
      asset.gameId,
      asset.filename,
    );

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Supprimer l'entrée en base
    return this.prisma.asset.delete({
      where: { id },
    });
  }
}
