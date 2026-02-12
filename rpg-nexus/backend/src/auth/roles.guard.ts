// 📍 Fichier : backend/src/auth/roles.guard.ts
// 🎯 Rôle : Vérifie que l'utilisateur a le bon rôle (ex: ADMIN uniquement)
// 💡 Utilisation : @Roles('ADMIN') au-dessus d'une route

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1️⃣ Récupère les rôles autorisés depuis le décorateur @Roles()
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    
    if (!requiredRoles) {
      return true; // Pas de restriction de rôle
    }

    // 2️⃣ Récupère l'utilisateur depuis la requête (ajouté par JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // 3️⃣ Vérifie si l'utilisateur a un des rôles requis
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Accès refusé : rôle ${requiredRoles.join(' ou ')} requis`
      );
    }

    return true;
  }
}

// 🎨 Décorateur personnalisé pour faciliter l'usage
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);