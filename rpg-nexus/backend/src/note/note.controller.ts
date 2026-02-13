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
import { NoteService } from './note.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('note')
@UseGuards(JwtAuthGuard)
export class NoteController {
  constructor(
    private noteService: NoteService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromNote(noteId: string): Promise<string> {
    const note = await this.prisma.note.findUniqueOrThrow({ where: { id: noteId }, select: { gameId: true } });
    return note.gameId;
  }

  @Get('game/:gameId')
  async getGameNotes(@Param('gameId') gameId: string) {
    return this.noteService.getGameNotes(gameId);
  }

  @Post('game/:gameId')
  async createNote(
    @Param('gameId') gameId: string,
    @Req() req,
    @Body() body: { title: string; content: string; category?: string; gameDate?: string },
  ) {
    const userId = req.user.sub || req.user.id;
    const result = await this.noteService.createNote(gameId, userId, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'note');
    return result;
  }

  @Put(':noteId')
  async updateNote(
    @Param('noteId') noteId: string,
    @Req() req,
    @Body() body: { title?: string; content?: string; category?: string; isPinned?: boolean; gameDate?: string },
  ) {
    const userId = req.user.sub || req.user.id;
    const gameId = await this.getGameIdFromNote(noteId);
    const result = await this.noteService.updateNote(noteId, userId, body);
    this.wsGateway.broadcastGameDataChanged(gameId, 'note');
    return result;
  }

  @Delete(':noteId')
  async deleteNote(@Param('noteId') noteId: string, @Req() req) {
    const userId = req.user.sub || req.user.id;
    const gameId = await this.getGameIdFromNote(noteId);
    const result = await this.noteService.deleteNote(noteId, userId);
    this.wsGateway.broadcastGameDataChanged(gameId, 'note');
    return result;
  }
}
