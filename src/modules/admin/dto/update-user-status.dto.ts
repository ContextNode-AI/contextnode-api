import { IsEnum, IsNotEmpty } from 'class-validator';
import { AccountStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(AccountStatus)
  @IsNotEmpty()
  status: AccountStatus;
}

