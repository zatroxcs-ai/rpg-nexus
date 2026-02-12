// 📍 Fichier : backend/src/character/character.controller.ts
// 🎯 Rôle : Routes HTTP pour les personnages
// 💡 CRUD complet avec authentification JWT

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
import { CharacterService } from './character.service';
import { CreateCharacterDto, UpdateCharacterDto } from './dto/character.dto';

@Controller('character')
@UseGuards(JwtAuthGuard)
export class CharacterController {
  constructor(private characterService: CharacterService) {}

  // ═══════════════════════════════════════════════════════
  // CREATE - Créer un personnage
  // POST /character
  // ═══════════════════════════════════════════════════════

  @Post()
  async create(@Req() req, @Body() dto: CreateCharacterDto) {
    return this.characterService.create(req.user.id, dto);
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer tous les personnages d'une partie
  // GET /character/game/:gameId
  // ═══════════════════════════════════════════════════════

  @Get('game/:gameId')
  async findAllByGame(@Req() req, @Param('gameId') gameId: string) {
    return this.characterService.findAllByGame(req.user.id, gameId);
  }

  // ═══════════════════════════════════════════════════════
  // READ - Récupérer un personnage par ID
  // GET /character/:id
  // ═══════════════════════════════════════════════════════

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.characterService.findOne(req.user.id, id);
  }

  // ═══════════════════════════════════════════════════════
  // UPDATE - Modifier un personnage
  // PUT /character/:id
  // ═══════════════════════════════════════════════════════

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.characterService.update(req.user.id, id, dto);
  }

  // ═══════════════════════════════════════════════════════
  // DELETE - Supprimer un personnage
  // DELETE /character/:id
  // ═══════════════════════════════════════════════════════

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.characterService.remove(req.user.id, id);
  }
}
