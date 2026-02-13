// 📍 Fichier : backend/src/prisma/prisma.module.ts
// 🎯 Rôle : Déclare PrismaService comme un module réutilisable
// 💡 Tous les autres modules pourront "importer" Prisma grâce à ce fichier

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ⭐ Rend Prisma disponible PARTOUT sans avoir à l'importer à chaque fois
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 📤 Permet aux autres modules d'utiliser PrismaService
})
export class PrismaModule {}