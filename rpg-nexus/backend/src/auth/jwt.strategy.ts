// 📍 Fichier : backend/src/auth/jwt.strategy.ts
// 🎯 Rôle : Vérifie que le token JWT envoyé par le frontend est valide
// 💡 Utilisé automatiquement par Passport pour protéger les routes

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    
    if (!jwtSecret) {
      throw new Error('JWT_SECRET n\'est pas défini dans le fichier .env');
    }

    super({
      // 📍 Extrait le token depuis le header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // ⏰ Rejette les tokens expirés
      secretOrKey: jwtSecret, // 🔑 Clé secrète depuis .env
    });
  }

  // ✅ Appelé automatiquement si le token est valide
  // Le "payload" contient les données encodées dans le token (userId, email, role)
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // ⭐ Cet objet sera disponible via @Req() dans les controllers
    return user;
  }
}