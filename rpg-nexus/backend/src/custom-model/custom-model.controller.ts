// 📍 Fichier : backend/src/custom-model/custom-model.controller.ts
// 🎯 Rôle : Routes HTTP pour les templates de personnages
// 💡 CRUD avec authentification JWT

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomModelService } from './custom-model.service';
import { CreateCustomModelDto, UpdateCustomModelDto } from './dto/custom-model.dto';

@Controller('custom-model')
@UseGuards(JwtAuthGuard)
export class CustomModelController {
  constructor(private customModelService: CustomModelService) {}

  // ═══════════════════════════════════════════════════════
  // CREATE - Créer un template
  // POST /custom-model
  // ═══════════════════════════════════════════════════════

  @Post()
  async create(@Req() req, @Body() dto: CreateCustomModelDto) {
    return this.customModelService.create(req.user.id, dto);
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer tous les templates d'une partie
  // GET /custom-model/game/:gameId
  // ═══════════════════════════════════════════════════════

  @Get('game/:gameId')
  async findAllByGame(@Req() req, @Param('gameId') gameId: string) {
    return this.customModelService.findAllByGame(req.user.id, gameId);
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer un template par ID
  // GET /custom-model/:id
  // ═══════════════════════════════════════════════════════

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.customModelService.findOne(req.user.id, id);
  }

  // ═══════════════════════════════════════════════════════
  // READ - Obtenir un schéma par défaut
  // GET /custom-model/default-schema
  // ═══════════════════════════════════════════════════════

  @Get('default/schema')
  async getDefaultSchema() {
    return this.customModelService.getDefaultSchema();
  }

  // ═══════════════════════════════════════════════════════
  // UPDATE - Modifier un template
  // PUT /custom-model/:id
  // ═══════════════════════════════════════════════════════

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateCustomModelDto,
  ) {
    return this.customModelService.update(req.user.id, id, dto);
  }

  // ═══════════════════════════════════════════════════════
  // DELETE - Supprimer un template
  // DELETE /custom-model/:id
  // ═══════════════════════════════════════════════════════

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.customModelService.remove(req.user.id, id);
  }
}
