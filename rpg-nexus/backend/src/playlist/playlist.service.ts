import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto, UpdatePlaylistDto, AddTrackDto } from './dto/playlist.dto';

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) {}

  private async assertGameOwner(gameId: string, userId: string) {
    const game = await this.prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    if (game.ownerId !== userId) throw new ForbiddenException('Seul le MJ peut gerer les playlists');
  }

  async getPlaylistsByGame(gameId: string) {
    return this.prisma.playlist.findMany({
      where: { gameId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPlaylistById(id: string) {
    return this.prisma.playlist.findUniqueOrThrow({ where: { id } });
  }

  async createPlaylist(gameId: string, userId: string, dto: CreatePlaylistDto) {
    await this.assertGameOwner(gameId, userId);
    return this.prisma.playlist.create({
      data: {
        gameId,
        name: dto.name,
        description: dto.description,
        tracks: [],
      },
    });
  }

  async updatePlaylist(id: string, userId: string, dto: UpdatePlaylistDto) {
    const playlist = await this.prisma.playlist.findUniqueOrThrow({ where: { id } });
    await this.assertGameOwner(playlist.gameId, userId);
    return this.prisma.playlist.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tracks !== undefined && { tracks: dto.tracks }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deletePlaylist(id: string, userId: string) {
    const playlist = await this.prisma.playlist.findUniqueOrThrow({ where: { id } });
    await this.assertGameOwner(playlist.gameId, userId);
    return this.prisma.playlist.delete({ where: { id } });
  }

  async addTrack(id: string, userId: string, dto: AddTrackDto) {
    const playlist = await this.prisma.playlist.findUniqueOrThrow({ where: { id } });
    await this.assertGameOwner(playlist.gameId, userId);
    const tracks = (playlist.tracks as any[]) || [];
    tracks.push({
      id: Date.now().toString(),
      assetId: dto.assetId,
      name: dto.name,
      url: dto.url,
      addedAt: new Date().toISOString(),
    });
    return this.prisma.playlist.update({
      where: { id },
      data: { tracks },
    });
  }

  async removeTrack(id: string, userId: string, trackId: string) {
    const playlist = await this.prisma.playlist.findUniqueOrThrow({ where: { id } });
    await this.assertGameOwner(playlist.gameId, userId);
    const tracks = ((playlist.tracks as any[]) || []).filter(t => t.id !== trackId);
    return this.prisma.playlist.update({
      where: { id },
      data: { tracks },
    });
  }

  async setActive(gameId: string, userId: string, playlistId: string | null) {
    await this.assertGameOwner(gameId, userId);
    await this.prisma.playlist.updateMany({
      where: { gameId, isActive: true },
      data: { isActive: false },
    });
    if (playlistId) {
      await this.prisma.playlist.update({
        where: { id: playlistId },
        data: { isActive: true },
      });
    }
    return { success: true };
  }
}
