// 📍 Fichier : backend/src/auth/auth.service.ts
// 🎯 Rôle : Contient TOUTE la logique d'authentification
// 💡 Inscription, connexion, vérification de mot de passe, création de JWT

import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 📝 INSCRIPTION
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email: rawEmail, username, password, role } = registerDto;
    const email = rawEmail.toLowerCase().trim();

    // 1️⃣ Vérifie si l'email existe déjà
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email ou nom d\'utilisateur déjà utilisé');
    }

    // 2️⃣ Crypte le mot de passe (JAMAIS en clair dans la BDD !)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Crée l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: role || 'PLAYER',
      },
    });

    // 4️⃣ Génère un token JWT
    const token = this.createToken(user.id, user.email, user.role);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  // 🔐 CONNEXION
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { emailOrUsername: rawEmailOrUsername, password } = loginDto;
    const emailOrUsername = rawEmailOrUsername.toLowerCase().trim();

    // 1️⃣ Trouve l'utilisateur (par email OU username)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // 2️⃣ Vérifie le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // 3️⃣ Génère un token JWT
    const token = this.createToken(user.id, user.email, user.role);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  // 🎫 Crée un token JWT (contient l'ID et le rôle de l'utilisateur)
  private createToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  // 🔍 Vérifie un token et renvoie l'utilisateur
  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });
  }
}