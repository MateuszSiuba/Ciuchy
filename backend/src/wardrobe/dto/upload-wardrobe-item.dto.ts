import { WardrobeCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadWardrobeItemDto {
  @IsString()
  userId!: string;

  @IsString()
  name!: string;

  @IsEnum(WardrobeCategory)
  category!: WardrobeCategory;

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
