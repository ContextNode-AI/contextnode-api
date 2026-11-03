import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssetStatus, PromptFamily, PromptType } from '@prisma/client';

export class QueryPromptsDto {
  @IsEnum(PromptFamily)
  @IsOptional()
  family?: PromptFamily;

  @IsEnum(PromptType)
  @IsOptional()
  type?: PromptType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  tool?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;
}
