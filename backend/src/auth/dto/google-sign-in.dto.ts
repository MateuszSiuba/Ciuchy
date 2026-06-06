import { IsOptional, IsString } from 'class-validator';

export class GoogleSignInDto {
  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}