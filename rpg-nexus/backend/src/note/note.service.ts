import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoteService {
  constructor(private prisma: PrismaService) {}

  // Get all notes for a game, pinned first then by most recent update
  async getGameNotes(gameId: string) {
    return this.prisma.note.findMany({
      where: { gameId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        author: {
          select: { username: true },
        },
      },
    });
  }

  // Create a new note in a game
  async createNote(
    gameId: string,
    authorId: string,
    data: { title: string; content: string; category?: string; gameDate?: string; participants?: any[] },
  ) {
    return this.prisma.note.create({
      data: {
        gameId,
        authorId,
        title: data.title,
        content: data.content,
        category: data.category || 'session',
        gameDate: data.gameDate || null,
        participants: data.participants || [],
      },
      include: {
        author: {
          select: { username: true },
        },
      },
    });
  }

  // Update a note (author or game owner only)
  async updateNote(
    noteId: string,
    userId: string,
    data: { title?: string; content?: string; category?: string; isPinned?: boolean; gameDate?: string; participants?: any[] },
  ) {
    await this.assertAccess(noteId, userId);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.gameDate !== undefined) updateData.gameDate = data.gameDate || null;
    if (data.participants !== undefined) updateData.participants = data.participants;

    return this.prisma.note.update({
      where: { id: noteId },
      data: updateData,
      include: {
        author: {
          select: { username: true },
        },
      },
    });
  }

  // Delete a note (author or game owner only)
  async deleteNote(noteId: string, userId: string) {
    await this.assertAccess(noteId, userId);

    await this.prisma.note.delete({
      where: { id: noteId },
    });

    return { message: 'Note deleted successfully' };
  }

  // Check if user is the note author or the game owner
  private async assertAccess(noteId: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        game: { select: { ownerId: true } },
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const isAuthor = note.authorId === userId;
    const isGameOwner = note.game.ownerId === userId;

    if (!isAuthor && !isGameOwner) {
      throw new ForbiddenException('You do not have permission to modify this note');
    }

    return note;
  }
}
