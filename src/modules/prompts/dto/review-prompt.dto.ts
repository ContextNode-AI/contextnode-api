import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewPromptDto {
  @IsEnum(ReviewAction)
  @IsNotEmpty()
  action: ReviewAction;

  @IsString()
  @IsOptional()
  feedback?: string;
}
