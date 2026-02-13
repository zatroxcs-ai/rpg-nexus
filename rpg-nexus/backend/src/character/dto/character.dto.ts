// 📍 Fichier : backend/src/character/dto/character.dto.ts
// 🎯 Rôle : DTOs pour la gestion des personnages (SYSTÈME FLEXIBLE)
// 💡 Validation des données pour le système basé sur CustomModel

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

// ╔═══════════════════════════════════════════════════════╗
// DTO CRÉATION
// ╚═══════════════════════════════════════════════════════╝
export class CreateCharacterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsObject()
  @IsOptional()
  data?: any; // Données flexibles basées sur le CustomModel

  @IsString()
  @IsOptional()
  modelId?: string; // Référence au CustomModel utilisé
}

// ╔═══════════════════════════════════════════════════════╗
// DTO MISE À JOUR
// ╚═══════════════════════════════════════════════════════╝
export class UpdateCharacterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsObject()
  @IsOptional()
  data?: any; // Données flexibles

  @IsString()
  @IsOptional()
  modelId?: string;
}