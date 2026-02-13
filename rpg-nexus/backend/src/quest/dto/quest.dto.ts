import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuestStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum QuestPriority {
  MAIN = 'MAIN',
  SECONDARY = 'SECONDARY',
  HIDDEN = 'HIDDEN',
}

// ── Quest ──────────────────────────────────────────────

export class CreateQuestDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(QuestStatus)
  status?: QuestStatus;

  @IsOptional()
  @IsEnum(QuestPriority)
  priority?: QuestPriority;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  xpReward?: number;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  gmNotes?: string;

  @IsOptional()
  @IsString()
  parentQuestId?: string;
}

export class UpdateQuestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(QuestStatus)
  status?: QuestStatus;

  @IsOptional()
  @IsEnum(QuestPriority)
  priority?: QuestPriority;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  xpReward?: number;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  gmNotes?: string;

  @IsOptional()
  @IsString()
  parentQuestId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

// ── QuestStep ──────────────────────────────────────────

export class CreateQuestStepDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateQuestStepDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

// ── QuestAssignment ────────────────────────────────────

export class CreateQuestAssignmentDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsString()
  entityName: string;

  @IsOptional()
  @IsString()
  entityAvatar?: string;
}

// ── QuestReward ────────────────────────────────────────

export class CreateQuestRewardDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  itemName: string;

  @IsOptional()
  @IsString()
  itemImage?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}
