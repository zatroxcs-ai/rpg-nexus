// 📍 Fichier : backend/src/game/dto/game.dto.ts
// 🎯 Rôle : Définit les formats de données pour créer/modifier une partie
// 💡 Permet la validation automatique et l'auto-complétion TypeScript

import { IsString, IsOptional, IsBoolean, IsObject, MinLength, MaxLength } from 'class-validator';

// DTO pour créer une nouvelle partie
export class CreateGameDto {
  @IsString()
  @MinLength(3, { message: 'Le nom doit faire au moins 3 caractères' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  coverImage?: string; // URL de l'image de couverture

  @IsObject()
  @IsOptional()
  customStyles?: {
    backgroundColor?: string;
    fontFamily?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontSize?: string;
    // On peut ajouter d'autres propriétés CSS dynamiques ici
  };
}

// DTO pour mettre à jour une partie existante
export class UpdateGameDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean; // Permet de mettre en pause une partie

  @IsObject()
  @IsOptional()
  customStyles?: {
    backgroundColor?: string;
    fontFamily?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontSize?: string;
  };
}

// DTO pour inviter un joueur
export class InvitePlayerDto {
  @IsString()
  playerId: string; // ID de l'utilisateur à inviter
}

// DTO pour la réponse (ce qu'on renvoie au frontend)
export class GameResponseDto {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  isActive: boolean;
  customStyles?: any;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    username: string;
  };
  playersCount?: number;
}