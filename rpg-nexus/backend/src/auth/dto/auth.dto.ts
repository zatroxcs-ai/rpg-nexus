// 📍 Fichier : backend/src/auth/dto/auth.dto.ts
// 🎯 Rôle : Définit et VALIDE les données envoyées par le frontend
// 💡 DTO = "Data Transfer Object" = Format attendu pour l'inscription/connexion

import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

// DTO pour l'inscription
export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Le nom d\'utilisateur doit faire au moins 3 caractères' })
  username: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  password: string;

  @IsEnum(Role)
  @IsOptional() // Optionnel : par défaut = PLAYER
  role?: Role;
}

// DTO pour la connexion
export class LoginDto {
  @IsString()
  emailOrUsername: string; // Permet de se connecter avec email OU username

  @IsString()
  password: string;
}

// DTO pour la réponse (ce qu'on renvoie au frontend)
export class AuthResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: Role;
  };
}