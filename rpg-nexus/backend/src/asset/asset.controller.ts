// 📍 Fichier : backend/src/asset/asset.controller.ts
// 🎯 Routes HTTP pour les assets
// 💡 Upload avec multer + CRUD

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetService } from './asset.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('asset')
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private assetService: AssetService) {}

  // ═══════════════════════════════════════════════════════
  // UPLOAD - Upload un fichier
  // POST /asset/upload/:gameId
  // ═══════════════════════════════════════════════════════
  @Post('upload/:gameId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const gameId = req.params.gameId;
          const uploadPath = path.join(process.cwd(), 'uploads', gameId);

          // Créer le dossier si nécessaire
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Nom unique : timestamp + nom original
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          cb(null, `${name}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (req, file, cb) => {
        // Types autorisés
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/webm',
          'audio/mpeg',
          'audio/wav',
          'audio/ogg',
          'application/pdf',
          'model/gltf-binary',
          'model/gltf+json',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Type de fichier non autorisé. Formats acceptés : images, vidéos, audios, PDF, 3D',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @Req() req,
    @Param('gameId') gameId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier uploadé');
    }

    // Déterminer la catégorie
    let category = 'document';
    if (file.mimetype.startsWith('image/')) {
      category = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      category = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      category = 'audio';
    } else if (file.mimetype.includes('gltf')) {
      category = 'model3d';
    }

    // URL d'accès
    const url = `/uploads/${gameId}/${file.filename}`;

    // Créer l'asset en base
    const asset = await this.assetService.create(req.user.id, {
      name: file.originalname,
      filename: file.filename,
      url,
      type: file.mimetype,
      category,
      size: file.size,
      gameId,
    });

    return asset;
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer tous les assets d'une partie
  // GET /asset/game/:gameId
  // ═══════════════════════════════════════════════════════
  @Get('game/:gameId')
  async findAllByGame(@Req() req, @Param('gameId') gameId: string) {
    return this.assetService.findAllByGame(req.user.id, gameId);
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer un asset par ID
  // GET /asset/:id
  // ═══════════════════════════════════════════════════════
  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.assetService.findOne(req.user.id, id);
  }

  // ═══════════════════════════════════════════════════════
  // DELETE - Supprimer un asset
  // DELETE /asset/:id
  // ═══════════════════════════════════════════════════════
  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.assetService.remove(req.user.id, id);
  }
}
