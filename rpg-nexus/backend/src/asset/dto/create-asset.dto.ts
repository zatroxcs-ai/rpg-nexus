// 📍 Fichier : backend/src/asset/dto/create-asset.dto.ts
// 🎯 DTO pour la création d'assets

import { IsString, IsNotEmpty, IsInt, IsIn } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsIn(['image', 'video', 'audio', 'document', 'model3d'])
  category: string;

  @IsInt()
  size: number;

  @IsString()
  @IsNotEmpty()
  gameId: string;
}
