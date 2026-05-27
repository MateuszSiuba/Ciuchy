import { WardrobeCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWardrobeItemDto {
  @IsString()
  name!: string;

  @IsEnum(WardrobeCategory)
  category!: WardrobeCategory;

  @IsUrl()
  originalImageUrl!: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;
}
