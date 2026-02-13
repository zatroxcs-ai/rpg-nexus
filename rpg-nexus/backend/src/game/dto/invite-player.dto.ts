import { IsEmail } from 'class-validator';

export class InvitePlayerDto {
  @IsEmail()
  email: string;
}