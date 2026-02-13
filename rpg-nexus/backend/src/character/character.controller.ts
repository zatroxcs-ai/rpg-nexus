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
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('character')
@UseGuards(JwtAuthGuard)
export class CharacterController {
  constructor(
    private characterService: CharacterService,
    private wsGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  private async getGameIdFromCharacter(charId: string): Promise<string> {
    const c = await this.prisma.character.findUniqueOrThrow({ where: { id: charId }, select: { gameId: true } });
    return c.gameId;
  }

  @Post()
  async create(@Req() req, @Body() dto: CreateCharacterDto) {
    const result = await this.characterService.create(req.user.id, dto);
    if (dto.gameId) this.wsGateway.broadcastGameDataChanged(dto.gameId, 'character');
    return result;
  }

  @Get('game/:gameId')
  async findAllByGame(@Req() req, @Param('gameId') gameId: string) {
    return this.characterService.findAllByGame(req.user.id, gameId);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.characterService.findOne(req.user.id, id);
  }

  @Put(':id')
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateCharacterDto) {
    const gameId = await this.getGameIdFromCharacter(id);
    const result = await this.characterService.update(req.user.id, id, dto);
    this.wsGateway.broadcastGameDataChanged(gameId, 'character');
    return result;
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    const gameId = await this.getGameIdFromCharacter(id);
    const result = await this.characterService.remove(req.user.id, id);
    this.wsGateway.broadcastGameDataChanged(gameId, 'character');
    return result;
  }
}
