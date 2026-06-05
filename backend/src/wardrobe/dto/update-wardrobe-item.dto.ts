import { IsEnum, IsOptional, IsString } from 'class-validator';

import { WardrobeCategory } from '@prisma/client';

export class UpdateWardrobeItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(WardrobeCategory)
  category?: WardrobeCategory;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;
}