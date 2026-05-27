import { Body, Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadWardrobeItemDto } from './dto/upload-wardrobe-item.dto';
import { WardrobeService } from './wardrobe.service';

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  getWardrobe(@Query('userId') userId: string): Promise<unknown[]> {
    return this.wardrobeService.getWardrobeItems(userId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  uploadWardrobeItem(
    @Body() dto: UploadWardrobeItemDto,
    @UploadedFile() file: Express.Multer.File
  ): Promise<Record<string, unknown>> {
    return this.wardrobeService.createWardrobeItem(dto.userId, dto, file);
  }
}
