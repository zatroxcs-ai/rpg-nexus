// 📍 Fichier : backend/src/game/game.controller.ts
// 🎯 Rôle : Définit toutes les routes HTTP pour gérer les parties
// 💡 Utilise les Guards pour protéger les routes selon les rôles

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
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { InvitePlayerDto } from './dto/invite-player.dto';


@Controller('game')
@UseGuards(JwtAuthGuard) // 🔒 Toutes les routes nécessitent une authentification
export class GameController {
  constructor(
  private gameService: GameService,
  private prisma: PrismaService,
  ) {}

  // 📝 POST /api/game - Créer une partie (ADMIN uniquement)
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async createGame(@Req() req, @Body() createGameDto: CreateGameDto) {
    return this.gameService.createGame(req.user.id, createGameDto);
  }

  // 📋 GET /api/game/my-games - Récupérer les parties créées par le MJ
  @Get('my-games')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getMyGames(@Req() req) {
    return this.gameService.getGamesByOwner(req.user.id);
  }

  // 📋 GET /api/game/joined - Récupérer les parties où le joueur est invité
  @Get('joined')
  async getJoinedGames(@Req() req) {
    return this.gameService.getGamesForPlayer(req.user.id);
  }

  // 🔍 GET /api/game/:id - Récupérer une partie par son ID
  @Get(':id')
  async getGame(@Param('id') gameId: string, @Req() req) {
    return this.gameService.getGameById(gameId, req.user.id);
  }

  // ✏️ PUT /api/game/:id - Mettre à jour une partie (ADMIN uniquement)
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateGame(
    @Param('id') gameId: string,
    @Req() req,
    @Body() updateGameDto: UpdateGameDto,
  ) {
    return this.gameService.updateGame(gameId, req.user.id, updateGameDto);
  }

  // 🗑️ DELETE /api/game/:id - Supprimer une partie (ADMIN uniquement)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async deleteGame(@Param('id') gameId: string, @Req() req) {
    return this.gameService.deleteGame(gameId, req.user.id);
  }

  // 👥 POST /api/game/:id/invite - Inviter un joueur
  @Post(':id/invite')
  async invitePlayer(
  @Param('id') gameId: string,
  @Req() req,
  @Body() invitePlayerDto: InvitePlayerDto,
) {
  // Trouve le joueur par email
  const player = await this.prisma.user.findUnique({
    where: { email: invitePlayerDto.email },
  });

  if (!player) {
    throw new NotFoundException('Utilisateur introuvable avec cet email');
  }

  return this.gameService.invitePlayer(
    gameId,
    req.user.id,
    player.id,
  );
}

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  async exportGame(@Param('id') id: string, @Req() req) {
    return this.gameService.exportGame(req.user.id, id);
  }

  @Post(':id/import')
  @UseGuards(JwtAuthGuard)
  async importGame(@Param('id') id: string, @Req() req, @Body() body: any) {
    return this.gameService.importGame(req.user.id, id, body);
  }

  // 🚪 DELETE /api/game/:id/player/:playerId - Retirer un joueur
  @Delete(':id/player/:playerId')
  async removePlayer(
    @Param('id') gameId: string,
    @Param('playerId') playerId: string,
    @Req() req,
  ) {
    return this.gameService.removePlayer(gameId, req.user.id, playerId);
  }
}