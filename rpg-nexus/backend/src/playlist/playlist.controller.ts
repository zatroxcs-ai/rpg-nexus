import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto, UpdatePlaylistDto, AddTrackDto } from './dto/playlist.dto';

@Controller('playlist')
@UseGuards(JwtAuthGuard)
export class PlaylistController {
  constructor(private playlistService: PlaylistService) {}

  @Get('game/:gameId')
  async getByGame(@Param('gameId') gameId: string) {
    return this.playlistService.getPlaylistsByGame(gameId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.playlistService.getPlaylistById(id);
  }

  @Post('game/:gameId')
  async create(@Param('gameId') gameId: string, @Body() dto: CreatePlaylistDto, @Request() req) {
    return this.playlistService.createPlaylist(gameId, req.user.sub || req.user.id, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlaylistDto, @Request() req) {
    return this.playlistService.updatePlaylist(id, req.user.sub || req.user.id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.playlistService.deletePlaylist(id, req.user.sub || req.user.id);
  }

  @Post(':id/track')
  async addTrack(@Param('id') id: string, @Body() dto: AddTrackDto, @Request() req) {
    return this.playlistService.addTrack(id, req.user.sub || req.user.id, dto);
  }

  @Delete(':id/track/:trackId')
  async removeTrack(@Param('id') id: string, @Param('trackId') trackId: string, @Request() req) {
    return this.playlistService.removeTrack(id, req.user.sub || req.user.id, trackId);
  }

  @Post('game/:gameId/set-active')
  async setActive(@Param('gameId') gameId: string, @Body() body: { playlistId: string | null }, @Request() req) {
    return this.playlistService.setActive(gameId, req.user.sub || req.user.id, body.playlistId);
  }
}
