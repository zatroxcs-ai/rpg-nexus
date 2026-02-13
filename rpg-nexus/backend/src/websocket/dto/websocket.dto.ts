// 📍 Fichier : backend/src/websocket/dto/websocket.dto.ts
// 🎯 Rôle : Définit tous les DTOs (Data Transfer Objects) pour les WebSockets
// 💡 Types pour la validation et la sécurité des événements temps réel

import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

// ╔═══════════════════════════════════════════════════════════╗
// DTOs ENTRANTS (Client → Serveur)
// ╚═══════════════════════════════════════════════════════════╝

/**
 * DTO pour rejoindre une partie
 * Événement : joinGame
 */
export class JoinGameDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;
}

/**
 * DTO pour quitter une partie
 * Événement : leaveGame
 */
export class LeaveGameDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;
}

/**
 * DTO pour déclencher une animation
 * Événement : triggerAnimation
 */
export class TriggerAnimationDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  // Mode DB : ID d'une animation enregistrée
  @IsString()
  @IsOptional()
  animationId?: string;

  // Mode CSS inline : objet animation direct (sans DB)
  @IsObject()
  @IsOptional()
  animation?: {
    id?: string;
    effect: string;
    position?: { x: number; y: number };
    duration?: number;
  };
}

/**
 * DTO pour mettre à jour un personnage
 * Événement : updateCharacter
 */
export class UpdateCharacterDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsString()
  @IsNotEmpty()
  characterId: string;

  @IsObject()
  data: Record<string, any>; // Données JSON flexibles (stats, inventaire, etc.)
}

/**
 * DTO pour mettre à jour les styles du jeu
 * Événement : updateGameStyles
 */
export class UpdateGameStylesDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsObject()
  customStyles: Record<string, any>; // Styles CSS personnalisés
}

// ╔═══════════════════════════════════════════════════════════╗
// EVENTS SORTANTS (Serveur → Clients)
// ╚═══════════════════════════════════════════════════════════╝

/**
 * Événement : Un joueur a rejoint la partie
 * Émis vers : Tous les joueurs de la partie
 */
export interface PlayerJoinedEvent {
  gameId: string;
  player: {
    id: string;
    username: string;
  };
  message: string;
}

/**
 * Événement : Un joueur a quitté la partie
 * Émis vers : Tous les joueurs de la partie
 */
export interface PlayerLeftEvent {
  gameId: string;
  playerId: string;
  message: string;
}

/**
 * Événement : Une animation a été déclenchée
 * Émis vers : Tous les joueurs de la partie
 */
export interface AnimationTriggeredEvent {
  gameId: string;
  animation: {
    // Champs communs
    id: string;
    duration: number;
    // Mode CSS inline
    effect?: string;
    position?: { x: number; y: number };
    // Mode fichier DB
    name?: string;
    fileUrl?: string;
    fileType?: string;
    positionX?: number;
    positionY?: number;
    width?: number;
    height?: number;
    loop?: boolean;
  };
}

/**
 * Événement : Un personnage a été mis à jour
 * Émis vers : Tous les joueurs de la partie
 */
export interface CharacterUpdatedEvent {
  gameId: string;
  character: {
    id: string;
    name: string;
    avatar?: string;
    data: any;
  };
}

/**
 * Événement : Les styles du jeu ont été modifiés
 * Émis vers : Tous les joueurs de la partie
 */
export interface GameStylesUpdatedEvent {
  gameId: string;
  customStyles: any;
}

/**
 * Événement : Notification générique
 * Émis vers : Joueurs spécifiques ou tous
 */
export interface NotificationEvent {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

/**
 * État complet d'une partie
 * Émis lors du joinGame
 */
export interface GameStateEvent {
  game: {
    id: string;
    name: string;
    customStyles: any;
  };
  characters: any[];
  animations: any[];
}
