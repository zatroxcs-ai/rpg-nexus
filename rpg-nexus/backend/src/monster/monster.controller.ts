// backend/src/monster/monster.controller.ts

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MonsterService } from './monster.service';

@Controller('monster')
@UseGuards(JwtAuthGuard)
export class MonsterController {
  constructor(private monsterService: MonsterService) {}

  // GET /api/monster/game/:gameId
  @Get('game/:gameId')
  async getAll(@Param('gameId') gameId: string) {
    return this.monsterService.getAll(gameId);
  }

  // GET /api/monster/:id
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.monsterService.getOne(id);
  }

  // POST /api/monster/game/:gameId
  @Post('game/:gameId')
  async create(@Param('gameId') gameId: string, @Request() req, @Body() body: any) {
    return this.monsterService.create(gameId, req.user.sub || req.user.id, body);
  }

  // PUT /api/monster/:id
  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.monsterService.update(id, req.user.sub || req.user.id, body);
  }

  // PUT /api/monster/:id/hp  (mise a jour rapide des PV en combat)
  @Put(':id/hp')
  async updateHp(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.monsterService.update(id, req.user.sub || req.user.id, { hp: body.hp });
  }

  // DELETE /api/monster/:id
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.monsterService.delete(id, req.user.sub || req.user.id);
  }
}
