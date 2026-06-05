import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadWardrobeItemDto } from './dto/upload-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { WardrobeService } from './wardrobe.service';
import { UploadableFile } from '../storage/storage.service';

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  getWardrobe(): Promise<unknown[]> {
    return this.wardrobeService.getWardrobeItems();
  }

  @Get('daily-suggestion')
  getDailySuggestion(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string
  ): Promise<Record<string, unknown>> {
    return this.wardrobeService.getDailySuggestion(lat, lon);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  uploadWardrobeItem(
    @Body() dto: UploadWardrobeItemDto,
    @UploadedFile() file: UploadableFile
  ): Promise<Record<string, unknown>> {
    return this.wardrobeService.createWardrobeItem(dto.userId, dto, file);
  }

  @Patch(':id')
  updateWardrobeItem(@Param('id') id: string, @Body() dto: UpdateWardrobeItemDto): Promise<Record<string, unknown>> {
    return this.wardrobeService.updateWardrobeItem(id, dto);
  }

  @Delete(':id')
  deleteWardrobeItem(@Param('id') id: string): Promise<Record<string, boolean>> {
    return this.wardrobeService.deleteWardrobeItem(id);
  }
}
