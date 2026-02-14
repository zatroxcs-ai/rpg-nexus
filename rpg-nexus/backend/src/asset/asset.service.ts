// 📍 Fichier : backend/src/asset/asset.service.ts
// 🎯 Service de gestion des assets — stockage Cloudinary persistant
// 💡 Les fichiers survivent aux redeploys Railway

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configuration Cloudinary via variables d'environnement Railway
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}

  // Upload un buffer mémoire vers Cloudinary
  private uploadBuffer(buffer: Buffer, options: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
      Readable.from(buffer).pipe(stream);
    });
  }

  private getCategory(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('gltf'))    return 'model3d';
    return 'document';
  }

  // Cloudinary resource_type selon le mimetype
  private getResourceType(mimetype: string): 'image' | 'video' | 'raw' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    return 'raw'; // audio, pdf, 3D
  }

  // ═══════════════════════════════════════════════════════
  // UPLOAD - Envoie le fichier vers Cloudinary
  // ═══════════════════════════════════════════════════════
  async uploadToCloudinary(userId: string, gameId: string, file: Express.Multer.File) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
    if (!game) throw new NotFoundException('Partie introuvable');

    const isOwner  = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);
    if (!isOwner && !isPlayer) throw new ForbiddenException("Vous n'avez pas accès à cette partie");

    const resourceType = this.getResourceType(file.mimetype);
    const category     = this.getCategory(file.mimetype);

    // Upload vers Cloudinary dans un dossier par partie
    const result = await this.uploadBuffer(file.buffer, {
      folder:          `rpg-nexus/${gameId}`,
      resource_type:   resourceType,
      use_filename:    true,
      unique_filename: true,
    });

    // Sauvegarder en base avec l'URL permanente Cloudinary
    return this.prisma.asset.create({
      data: {
        name:       file.originalname,
        filename:   result.public_id,    // public_id Cloudinary (pour suppression future)
        url:        result.secure_url,   // URL HTTPS permanente → survit aux redeploys
        type:       file.mimetype,
        category,
        size:       file.size,
        gameId,
        uploaderId: userId,
      },
      include: {
        uploader: { select: { id: true, username: true } },
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  // READ - Tous les assets d'une partie
  // ═══════════════════════════════════════════════════════
  async findAllByGame(userId: string, gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
    if (!game) throw new NotFoundException('Partie introuvable');

    const isOwner  = game.ownerId === userId;
    const isPlayer = game.players.some((gp) => gp.playerId === userId);
    if (!isOwner && !isPlayer) throw new ForbiddenException("Vous n'avez pas accès à cette partie");

    return this.prisma.asset.findMany({
      where: { gameId },
      include: { uploader: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════
  // READ - Un asset par ID
  // ═══════════════════════════════════════════════════════
  async findOne(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        game: { include: { players: true } },
        uploader: { select: { id: true, username: true } },
      },
    });
    if (!asset) throw new NotFoundException('Asset introuvable');

    const isOwner  = asset.game.ownerId === userId;
    const isPlayer = asset.game.players.some((gp) => gp.playerId === userId);
    if (!isOwner && !isPlayer) throw new ForbiddenException("Vous n'avez pas accès à cet asset");

    return asset;
  }

  // ═══════════════════════════════════════════════════════
  // DELETE - Supprime de Cloudinary + base de données
  // ═══════════════════════════════════════════════════════
  async remove(userId: string, id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { game: true },
    });
    if (!asset) throw new NotFoundException('Asset introuvable');

    const isOwner    = asset.game.ownerId === userId;
    const isUploader = asset.uploaderId === userId;
    if (!isOwner && !isUploader) throw new ForbiddenException('Vous ne pouvez pas supprimer cet asset');

    // Supprimer de Cloudinary (public_id contient '/' pour les assets uploadés via ce service)
    if (asset.filename && asset.filename.includes('/')) {
      const resourceType = this.getResourceType(asset.type || '');
      try {
        await cloudinary.uploader.destroy(asset.filename, { resource_type: resourceType });
      } catch (err) {
        console.error('Erreur suppression Cloudinary (non bloquant):', err?.message);
      }
    }

    return this.prisma.asset.delete({ where: { id } });
  }
}
