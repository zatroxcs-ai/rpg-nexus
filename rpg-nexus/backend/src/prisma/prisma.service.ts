// 📍 Fichier : backend/src/prisma/prisma.service.ts
// 🎯 Rôle : Ce fichier gère la connexion à PostgreSQL via Prisma
// 💡 C'est le "traducteur" entre NestJS et la base de données

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // 🔌 Connexion à la BDD au démarrage de l'application
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Connecté à PostgreSQL via Prisma');
  }

  // 🔌 Déconnexion propre quand l'app s'arrête
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('👋 Déconnecté de PostgreSQL');
  }

  // 🧹 Méthode utile pour nettoyer la BDD pendant les tests
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('⛔ Impossible de nettoyer la BDD en production !');
    }

    // Supprime toutes les données dans l'ordre (à cause des relations)
    await this.animation.deleteMany();
    await this.character.deleteMany();
    await this.customModel.deleteMany();
    await this.gamePlayer.deleteMany();
    await this.game.deleteMany();
    await this.user.deleteMany();
    
    console.log('🧹 Base de données nettoyée');
  }
}