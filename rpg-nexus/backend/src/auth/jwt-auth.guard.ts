// 📍 Fichier : backend/src/auth/jwt-auth.guard.ts
// 🎯 Rôle : Protège les routes - seuls les utilisateurs connectés peuvent y accéder
// 💡 Utilisation : @UseGuards(JwtAuthGuard) au-dessus d'un controller ou d'une route

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // Permet de rendre certaines routes publiques avec @Public()
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    
    if (isPublic) {
      return true; // ✅ Route publique, pas besoin de token
    }
    
    return super.canActivate(context); // 🔐 Route protégée, vérifie le token
  }
}