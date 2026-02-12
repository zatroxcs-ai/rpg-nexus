// 📍 Fichier : backend/src/custom-model/dto/custom-model.dto.ts
// 🎯 Rôle : DTOs pour la gestion des templates de personnages
// 💡 Validation des schémas JSON flexibles

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';

// ╔═══════════════════════════════════════════════════════╗
// DTO CRÉATION
// ╚═══════════════════════════════════════════════════════╝

export class CreateCustomModelDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Ex: "Fiche Personnage Médiéval"

  @IsString()
  @IsOptional()
  description?: string; // Ex: "Template pour jeux médiévaux fantastiques"

  @IsString()
  @IsNotEmpty()
  gameId: string; // ID de la partie

  @IsObject()
  @IsNotEmpty()
  schema: any; // Le schéma JSON flexible
  // Exemple:
  // {
  //   "stats": {
  //     "Force": { "type": "number", "default": 10, "min": 1, "max": 20 },
  //     "Magie": { "type": "number", "default": 5, "min": 0, "max": 15 }
  //   },
  //   "fields": {
  //     "Race": { "type": "select", "options": ["Humain", "Elfe", "Nain"] },
  //     "Classe": { "type": "text", "required": true }
  //   }
  // }
}

// ╔═══════════════════════════════════════════════════════╗
// DTO MISE À JOUR
// ╚═══════════════════════════════════════════════════════╝

export class UpdateCustomModelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  schema?: any;
}
