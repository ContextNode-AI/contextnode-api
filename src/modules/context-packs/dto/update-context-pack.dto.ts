import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetStatus } from '@prisma/client';
import { ValidationGateDto, PackFileDto } from './create-context-pack.dto';

export class UpdateContextPackDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

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

  @IsOptional()
  @IsString()
  systemPrompt?: string;

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

