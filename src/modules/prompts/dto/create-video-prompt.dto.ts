import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccessModel, AssetStatus } from '@prisma/client';
import { PromptVariationDto } from './create-image-prompt.dto';

export class CreateVideoPromptDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  negativePrompt?: string;

  @IsString()
  @IsOptional()
  previewImageUrl?: string; // Poster thumbnail

  @IsString()
  @IsOptional()
  previewVideoUrl?: string; // Video file URL

  @IsString()
  @IsOptional()
  previewContent?: string;

  // Video Engine Parameters
  @IsString()
  @IsOptional()
  aiTool?: string; // Runway Gen-3, OpenAI Sora, Kling AI, Luma Dream Machine, etc.

  @IsString()
  @IsOptional()
  model?: string; // e.g. Gen-3 Alpha Turbo, Kling 1.5

  @IsString()
  @IsOptional()
  aspectRatio?: string; // 16:9, 9:16, 1:1, 2.39:1, 4:3

  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  // Video Choreography & Motion
  @IsString()
  @IsOptional()
  duration?: string; // 5s, 10s, 15s, 30s, 60s

  @IsNumber()
  @IsOptional()
  fps?: number; // 24, 30, 60, 120

  @IsNumber()
  @IsOptional()
  motionStrength?: number; // 1 - 10

  @IsString()
  @IsOptional()
  cameraMovement?: string; // Dynamic Tracking, Pan Left/Right, Orbit 360°, Zoom In, FPV Drone Sweep

  @IsString()
  @IsOptional()
  seed?: string;

  // Keyframes
  @IsString()
  @IsOptional()
  firstFrameImageUrl?: string;

  @IsString()
  @IsOptional()
  firstFramePrompt?: string;

  @IsString()
  @IsOptional()
  lastFrameImageUrl?: string;

  @IsString()
  @IsOptional()
  lastFramePrompt?: string;

  // Taxonomy
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  // Storyboard Variations / Scenes
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptVariationDto)
  @IsOptional()
  variations?: PromptVariationDto[];

  // Access & Monetization
  @IsEnum(AccessModel)
  @IsOptional()
  accessType?: AccessModel;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  // Lifecycle
  @IsEnum(AssetStatus)
  @IsOptional()
  status?: AssetStatus;

  // SEO
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @IsString()
  @IsOptional()
  seoDescription?: string;

  @IsString()
  @IsOptional()
  ogImageUrl?: string;
}

