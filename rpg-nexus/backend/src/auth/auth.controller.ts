// 📍 Fichier : backend/src/auth/auth.controller.ts
// 🎯 Rôle : Définit les routes HTTP pour l'authentification
// 💡 Routes : POST /auth/register, POST /auth/login, GET /auth/me

import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth') // 🌐 Préfixe : toutes les routes commencent par /auth
export class AuthController {
  constructor(private authService: AuthService) {}

  // 📝 POST /auth/register - Inscription
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 🔐 POST /auth/login - Connexion
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 👤 GET /auth/me - Récupère les infos de l'utilisateur connecté
  @Get('me')
  @UseGuards(JwtAuthGuard) // 🔒 Route protégée, token JWT requis
  async getProfile(@Req() req) {
    // req.user est automatiquement rempli par JwtStrategy
    return {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
    };
  }
}