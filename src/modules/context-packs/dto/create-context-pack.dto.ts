import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus } from '@prisma/client';

export class ValidationGateDto {
  @IsString()
  @IsNotEmpty()
  gate: string;

  @IsOptional()
  enabled?: boolean;
}

export class PackFileDto {
  @IsString()
  @IsNotEmpty()
  path: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateContextPackDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsOptional()
  @IsString()
  fullDescription?: string;

  @IsOptional()
  @IsString()
  packVersion?: string;

  @IsOptional()
  @IsString()
  schemaUri?: string;

  @IsOptional()
  @IsString()
  targetPersona?: string;

  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsOptional()
  @IsString()
  goldenRules?: string;

  @IsOptional()
  @IsString()
  negativeConstraints?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedTools?: string[];

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationGateDto)
  validationGates?: ValidationGateDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackFileDto)
  files?: PackFileDto[];
}

