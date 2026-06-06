import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadWardrobeItemDto } from './dto/upload-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { WardrobeService } from './wardrobe.service';
import { UploadableFile } from '../storage/storage.service';

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  getWardrobe(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string): Promise<unknown[]> {
    const userId = this.resolveUserId(headerUserId, queryUserId);
    return this.wardrobeService.getWardrobeItems(userId);
  }

  @Get('daily-suggestion')
  getDailySuggestion(
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string
  ): Promise<Record<string, unknown>> {
    const userId = this.resolveUserId(headerUserId, queryUserId);
    return this.wardrobeService.getDailySuggestion(userId, lat, lon);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  uploadWardrobeItem(
    @UploadedFile() file: UploadableFile,
    @Body() dto: UploadWardrobeItemDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string
  ): Promise<Record<string, unknown>> {
    const userId = this.resolveUserId(dto.userId, headerUserId, queryUserId);
    return this.wardrobeService.createWardrobeItem(userId, dto, file);
  }

  @Patch(':id')
  updateWardrobeItem(
    @Param('id') id: string,
    @Body() dto: UpdateWardrobeItemDto,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string
  ): Promise<Record<string, unknown>> {
    const userId = this.resolveUserId(headerUserId, queryUserId);
    return this.wardrobeService.updateWardrobeItem(userId, id, dto);
  }

  @Delete(':id')
  deleteWardrobeItem(
    @Param('id') id: string,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string
  ): Promise<Record<string, boolean>> {
    const userId = this.resolveUserId(headerUserId, queryUserId);
    return this.wardrobeService.deleteWardrobeItem(userId, id);
  }

  private resolveUserId(...candidateIds: Array<string | undefined>): string {
    const userId = candidateIds.map((value) => value?.trim()).find((value) => Boolean(value));

    if (!userId) {
      throw new BadRequestException('Missing userId');
    }

    return userId;
  }
}
