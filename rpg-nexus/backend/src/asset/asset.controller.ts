// 📍 Fichier : backend/src/asset/asset.controller.ts
// 🎯 Routes HTTP pour les assets
// 💡 Upload avec multer (mémoire) → Cloudinary

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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetService } from './asset.service';

@Controller('asset')
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private assetService: AssetService) {}

  // POST /asset/upload/:gameId
  @Post('upload/:gameId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // En mémoire → on envoie à Cloudinary
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm',
          'audio/mpeg', 'audio/wav', 'audio/ogg',
          'application/pdf',
          'model/gltf-binary', 'model/gltf+json',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Type de fichier non autorisé. Formats acceptés : images, vidéos, audios, PDF, 3D'), false);
        }
      },
    }),
  )
  async uploadFile(
    @Req() req,
    @Param('gameId') gameId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier uploadé');
    return this.assetService.uploadToCloudinary(req.user.id, gameId, file);
  }

  // GET /asset/game/:gameId
  @Get('game/:gameId')
  async findAllByGame(@Req() req, @Param('gameId') gameId: string) {
    return this.assetService.findAllByGame(req.user.id, gameId);
  }

  // GET /asset/:id
  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.assetService.findOne(req.user.id, id);
  }

  // DELETE /asset/:id
  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.assetService.remove(req.user.id, id);
  }
}
