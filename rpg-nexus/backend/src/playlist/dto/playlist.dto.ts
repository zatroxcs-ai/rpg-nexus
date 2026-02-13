import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreatePlaylistDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePlaylistDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tracks?: any[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddTrackDto {
  @IsString()
  assetId: string;

  @IsString()
  name: string;

  @IsString()
  url: string;
}
