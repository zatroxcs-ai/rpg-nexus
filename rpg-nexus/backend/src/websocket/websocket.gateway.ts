// 📍 Fichier : backend/src/websocket/websocket.gateway.ts
// 🎯 Rôle : Gère TOUTES les connexions WebSocket et la diffusion des événements
// 💡 C'est le "hub" central qui synchronise tous les clients en temps réel

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { DiceService } from '../dice/dice.service';
import type {
  JoinGameDto,
  LeaveGameDto,
  TriggerAnimationDto,
  UpdateCharacterDto,
  UpdateGameStylesDto,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  AnimationTriggeredEvent,
  CharacterUpdatedEvent,
  GameStylesUpdatedEvent,
  NotificationEvent,
} from './dto/websocket.dto';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      if (!origin || allowed.some(o => origin.startsWith(o as string)) || origin.endsWith('.railway.app')) {
        callback(null, true);
      } else {
        callback(null, true); // permissif pour l'instant
      }
    },
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');

  // Map pour tracer : socketId → { userId, gameId, username }
  private connectedClients = new Map<string, { userId: string; gameId?: string; username: string; role: string }>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private diceService: DiceService,
  ) {}

  // ╔═══════════════════════════════════════════════════════════╗
  // CONNEXION / DÉCONNEXION
  // ╚═══════════════════════════════════════════════════════════╝

  async handleConnection(client: Socket) {
    try {
      // Extrait le token JWT depuis le handshake
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} : Aucun token fourni`);
        client.disconnect();
        return;
      }

      // Vérifie le token
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, role: true },
      });

      if (!user) {
        this.logger.warn(`Client ${client.id} : Utilisateur introuvable`);
        client.disconnect();
        return;
      }

      // Enregistre le client
      this.connectedClients.set(client.id, {
        userId: user.id,
        username: user.username,
        role: user.role || 'PLAYER',
      });

      this.logger.log(`✅ Client connecté : ${user.username} (${client.id})`);
      client.emit('connected', { message: 'Connexion réussie', user });
    } catch (error) {
      this.logger.error(`Erreur de connexion : ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.connectedClients.get(client.id);

    if (clientData?.gameId) {
      // Notifie les autres joueurs
      const event: PlayerLeftEvent = {
        gameId: clientData.gameId,
        playerId: clientData.userId,
        message: `${clientData.username} a quitté la partie`,
      };
      this.server.to(clientData.gameId).emit('playerLeft', event);
    }

    this.connectedClients.delete(client.id);
    this.logger.log(`❌ Client déconnecté : ${clientData?.username || client.id}`);
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // REJOINDRE / QUITTER UNE PARTIE
  // ╚═══════════════════════════════════════════════════════════╝

  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinGameDto,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);

      if (!clientData) {
        client.emit('error', { message: 'Client non authentifié' });
        return;
      }

      // Vérifie que la partie existe
      const game = await this.prisma.game.findUnique({
        where: { id: data.gameId },
      });

      if (!game) {
        client.emit('error', { message: 'Partie introuvable' });
        return;
      }

      // Vérifie que l'utilisateur a accès (propriétaire OU joueur invité)
      const isOwner = game.ownerId === clientData.userId;
      const isPlayer = await this.prisma.gamePlayer.findUnique({
        where: {
          gameId_playerId: {
            gameId: data.gameId,
            playerId: clientData.userId,
          },
        },
      });

      if (!isOwner && !isPlayer) {
        client.emit('error', { message: 'Accès refusé à cette partie' });
        return;
      }

      // Rejoindre la "room" Socket.io
      client.join(data.gameId);
      this.connectedClients.set(client.id, {
        ...clientData,
        gameId: data.gameId,
      });

      this.logger.log(`🎮 ${clientData.username} a rejoint la partie ${data.gameId}`);

      // Notifie les autres joueurs
      const event: PlayerJoinedEvent = {
        gameId: data.gameId,
        player: {
          id: clientData.userId,
          username: clientData.username,
        },
        message: `${clientData.username} a rejoint la partie`,
      };
      this.server.to(data.gameId).emit('playerJoined', event);

      // Envoie l'état actuel du jeu au nouveau joueur
      const gameState = await this.getGameState(data.gameId);
      client.emit('gameState', gameState);

      // Charger l'historique du chat
      const chatHistory = await this.prisma.chatMessage.findMany({
        where: {
          gameId: data.gameId,
          OR: [
            { isWhisper: false },
            { isWhisper: true, userId: clientData.userId },
            { isWhisper: true, targetUserId: clientData.userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });
      client.emit('chatHistory', { messages: chatHistory.map(m => ({
        id: m.id,
        content: m.content,
        username: m.username,
        userId: m.userId,
        timestamp: m.createdAt.toISOString(),
        isWhisper: m.isWhisper,
        targetUserId: m.targetUserId,
      })) });
    } catch (error) {
      this.logger.error(`Erreur joinGame : ${error.message}`);
      client.emit('error', { message: 'Erreur lors de la connexion à la partie' });
    }
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveGameDto,
  ) {
    const clientData = this.connectedClients.get(client.id);

    if (clientData?.gameId === data.gameId) {
      client.leave(data.gameId);
      
      const event: PlayerLeftEvent = {
        gameId: data.gameId,
        playerId: clientData.userId,
        message: `${clientData.username} a quitté la partie`,
      };
      this.server.to(data.gameId).emit('playerLeft', event);

      this.connectedClients.set(client.id, {
        ...clientData,
        gameId: undefined,
      });

      this.logger.log(`👋 ${clientData.username} a quitté la partie ${data.gameId}`);
    }
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // ÉVÉNEMENTS MÉTIER (Animations, Personnages, Styles)
  // ╚═══════════════════════════════════════════════════════════╝

  @SubscribeMessage('triggerAnimation')
  async handleTriggerAnimation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TriggerAnimationDto,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);

      // Vérifie que c'est le MJ qui déclenche
      const game = await this.prisma.game.findUnique({
        where: { id: data.gameId },
      });

      if (!game || game.ownerId !== clientData?.userId) {
        client.emit('error', { message: 'Seul le MJ peut déclencher des animations' });
        return;
      }

      // Mode 1 : animation CSS inline (effet local, pas de DB)
      if (data.animation && !data.animationId) {
        const event = {
          gameId: data.gameId,
          animation: {
            id: data.animation.id || Date.now().toString(),
            effect: data.animation.effect,
            position: data.animation.position,
            duration: data.animation.duration || 2000,
          },
        };
        this.server.to(data.gameId).emit('animationTriggered', event);
        this.logger.log(`✨ Animation CSS "${data.animation.effect}" dans ${data.gameId}`);
        return;
      }

      // Mode 2 : animation depuis la DB (fichier vidéo/image)
      const animation = await this.prisma.animation.findUnique({
        where: { id: data.animationId },
      });

      if (!animation) {
        client.emit('error', { message: 'Animation introuvable' });
        return;
      }

      const event: AnimationTriggeredEvent = {
        gameId: data.gameId,
        animation: {
          id: animation.id,
          name: animation.name,
          fileUrl: animation.fileUrl,
          fileType: animation.fileType,
          positionX: animation.positionX || 0,
          positionY: animation.positionY || 0,
          width: animation.width || 100,
          height: animation.height || 100,
          duration: animation.duration || 3000,
          loop: animation.loop,
        },
      };
      this.server.to(data.gameId).emit('animationTriggered', event);
      this.logger.log(`✨ Animation "${animation.name}" déclenchée dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur triggerAnimation : ${error.message}`);
    }
  }

  @SubscribeMessage('updateCharacter')
  async handleUpdateCharacter(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateCharacterDto,
  ) {
    try {
      // Met à jour le personnage en BDD
      const character = await this.prisma.character.update({
        where: { id: data.characterId },
        data: { data: data.data },
      });

      // Diffuse la mise à jour à tous les joueurs
      const event: CharacterUpdatedEvent = {
        gameId: data.gameId,
        character: {
          id: character.id,
          name: character.name,
          avatar: character.avatar ?? undefined,
          data: character.data,
        },
      };
      this.server.to(data.gameId).emit('characterUpdated', event);

      this.logger.log(`📊 Personnage ${character.name} mis à jour dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur updateCharacter : ${error.message}`);
    }
  }

  @SubscribeMessage('updateGameStyles')
  async handleUpdateGameStyles(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateGameStylesDto,
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);

      // Vérifie que c'est le MJ
      const game = await this.prisma.game.findUnique({
        where: { id: data.gameId },
      });

      if (!game || game.ownerId !== clientData?.userId) {
        client.emit('error', { message: 'Seul le MJ peut modifier les styles' });
        return;
      }

      // Met à jour en BDD
      const existingStyles = game.customStyles as object || {};
      const updatedGame = await this.prisma.game.update({
        where: { id: data.gameId },
        data: {
          customStyles: { ...existingStyles, ...data.customStyles },
        },
      });

      // Diffuse le changement
      const event: GameStylesUpdatedEvent = {
        gameId: data.gameId,
        customStyles: updatedGame.customStyles,
      };
      this.server.to(data.gameId).emit('gameStylesUpdated', event);

      this.logger.log(`🎨 Styles mis à jour dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur updateGameStyles : ${error.message}`);
    }
  }

  // ╔═══════════════════════════════════════════════════════════╗
  // MÉTHODES UTILITAIRES
  // ╚═══════════════════════════════════════════════════════════╝

  // CHAT
  @SubscribeMessage('sendChatMessage')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; message: string },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData) return;
      const event = {
        gameId: data.gameId,
        message: {
          id: Date.now().toString(),
          content: data.message,
          username: clientData.username,
          userId: clientData.userId,
          role: clientData.role,
          timestamp: new Date().toISOString(),
        },
      };

      this.prisma.chatMessage.create({
        data: {
          gameId: data.gameId,
          userId: clientData.userId,
          username: clientData.username,
          content: data.message,
        },
      }).catch(err => this.logger.error(`Erreur sauvegarde chat: ${err.message}`));

      this.server.to(data.gameId).emit('chatMessage', event);
      this.logger.log(`Message de ${clientData.username} dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur sendChatMessage : ${error.message}`);
    }
  }

  // WHISPER (message privé MJ → joueur)
  @SubscribeMessage('whisper')
  async handleWhisper(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; targetUserId: string; message: string },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData) return;

      const game = await this.prisma.game.findUnique({
        where: { id: data.gameId },
        include: { players: { select: { playerId: true } } },
      });
      if (!game) return;
      const isOwner = game.ownerId === clientData.userId;
      const isPlayer = game.players.some(p => p.playerId === clientData.userId);
      if (!isOwner && !isPlayer) {
        client.emit('error', { message: 'Vous ne faites pas partie de cette partie' });
        return;
      }

      const whisperMsg = {
        id: Date.now().toString(),
        content: data.message,
        username: clientData.username,
        userId: clientData.userId,
        role: clientData.role,
        timestamp: new Date().toISOString(),
        isWhisper: true,
        targetUserId: data.targetUserId,
      };

      this.prisma.chatMessage.create({
        data: {
          gameId: data.gameId,
          userId: clientData.userId,
          username: clientData.username,
          content: data.message,
          isWhisper: true,
          targetUserId: data.targetUserId,
        },
      }).catch(err => this.logger.error(`Erreur sauvegarde whisper: ${err.message}`));

      // Envoie au MJ (expéditeur)
      client.emit('chatMessage', { gameId: data.gameId, message: whisperMsg });

      // Envoie au joueur cible
      for (const [socketId, cd] of this.connectedClients.entries()) {
        if (cd.userId === data.targetUserId && cd.gameId === data.gameId && socketId !== client.id) {
          this.server.to(socketId).emit('chatMessage', { gameId: data.gameId, message: whisperMsg });
        }
      }

      this.logger.log(`Whisper de ${clientData.username} → ${data.targetUserId} dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur whisper : ${error.message}`);
    }
  }

  // LANCEUR DE DES
  @SubscribeMessage('rollDice')
  async handleRollDice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; diceType: number; count: number; modifier: number; reason?: string },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData) return;
      const results: number[] = [];
      for (let i = 0; i < (data.count || 1); i++) {
        results.push(Math.floor(Math.random() * data.diceType) + 1);
      }
      const modifier = data.modifier || 0;
      const total = results.reduce((sum, r) => sum + r, 0) + modifier;
      const sign = modifier > 0 ? '+' + modifier : modifier < 0 ? String(modifier) : '';
      const formula = `${data.count}d${data.diceType}${sign}`;
      const roll = {
        id: Date.now().toString(),
        formula,
        diceType: data.diceType,
        count: data.count,
        modifier,
        results,
        total,
        reason: data.reason || null,
        username: clientData.username,
        userId: clientData.userId,
        role: clientData.role,
        timestamp: new Date().toISOString(),
      };
      this.server.to(data.gameId).emit('diceRolled', { gameId: data.gameId, roll });
      this.logger.log(`Lancer ${formula} = ${total} par ${clientData.username}`);

      this.diceService.saveDiceRoll({
        gameId: data.gameId,
        userId: clientData.userId,
        username: clientData.username,
        formula,
        diceType: data.diceType,
        count: data.count || 1,
        modifier,
        results,
        total,
        reason: data.reason,
      }).catch(err => this.logger.error(`Erreur sauvegarde dice: ${err.message}`));
    } catch (error) {
      this.logger.error(`Erreur rollDice : ${error.message}`);
    }
  }

  // AMBIANCE AUDIO
  @SubscribeMessage('playAudio')
  async handlePlayAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; url: string; name?: string; volume?: number; loop?: boolean },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      const game = await this.prisma.game.findUnique({ where: { id: data.gameId } });
      if (!game || game.ownerId !== clientData?.userId) {
        client.emit('error', { message: 'Seul le MJ peut lancer de la musique' });
        return;
      }
      this.server.to(data.gameId).emit('audioPlay', {
        url: data.url,
        name: data.name || 'Audio',
        volume: data.volume ?? 0.5,
        loop: data.loop ?? false,
      });
      this.logger.log(`🎵 Audio "${data.name}" lancé dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur playAudio : ${error.message}`);
    }
  }

  @SubscribeMessage('stopAudio')
  async handleStopAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      const game = await this.prisma.game.findUnique({ where: { id: data.gameId } });
      if (!game || game.ownerId !== clientData?.userId) return;
      this.server.to(data.gameId).emit('audioStop', {});
      this.logger.log(`🔇 Audio stoppé dans ${data.gameId}`);
    } catch (error) {
      this.logger.error(`Erreur stopAudio : ${error.message}`);
    }
  }

  @SubscribeMessage('setAudioVolume')
  async handleSetAudioVolume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; volume: number },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      const game = await this.prisma.game.findUnique({ where: { id: data.gameId } });
      if (!game || game.ownerId !== clientData?.userId) return;
      this.server.to(data.gameId).emit('audioVolume', { volume: data.volume });
    } catch (error) {
      this.logger.error(`Erreur setAudioVolume : ${error.message}`);
    }
  }

  // RÉCUPÉRER L'HISTORIQUE DU CHAT (à la demande)
  @SubscribeMessage('getChatHistory')
  async handleGetChatHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    try {
      const clientData = this.connectedClients.get(client.id);
      if (!clientData) return;

      const chatHistory = await this.prisma.chatMessage.findMany({
        where: {
          gameId: data.gameId,
          OR: [
            { isWhisper: false },
            { isWhisper: true, userId: clientData.userId },
            { isWhisper: true, targetUserId: clientData.userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });

      client.emit('chatHistory', {
        messages: chatHistory.map(m => ({
          id: m.id,
          content: m.content,
          username: m.username,
          userId: m.userId,

          timestamp: m.createdAt.toISOString(),
          isWhisper: m.isWhisper,
          targetUserId: m.targetUserId,
        })),
      });
    } catch (error) {
      this.logger.error(`Erreur getChatHistory : ${error.message}`);
    }
  }

  private async getGameState(gameId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        characters: true,
        animations: true,
      },
    });

    if (!game) {
      throw new Error('Partie introuvable');
    }

    return {
      game: {
        id: game.id,
        name: game.name,
        customStyles: game.customStyles,
      },
      characters: game.characters,
      animations: game.animations,
    };
  }

  // Méthode publique pour envoyer des notifications
  sendNotification(gameId: string, notification: NotificationEvent) {
    this.server.to(gameId).emit('notification', notification);
  }

  // COMBAT — diffuse l'état du combat à tous les joueurs de la partie
  broadcastCombatUpdate(gameId: string, combat: any) {
    this.server.to(gameId).emit('combatUpdate', { gameId, combat });
  }

  broadcastCombatAction(gameId: string, action: any) {
    this.server.to(gameId).emit('combatAction', { gameId, action });
  }

  broadcastCombatEnd(gameId: string, combat: any) {
    this.server.to(gameId).emit('combatEnd', { gameId, combat });
  }

  broadcastGameDataChanged(gameId: string, dataType: string) {
    this.server.to(gameId).emit('gameDataChanged', { gameId, dataType, timestamp: Date.now() });
    this.logger.log(`[SYNC] gameDataChanged: ${dataType} in ${gameId}`);
  }
}
