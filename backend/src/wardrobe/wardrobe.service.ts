import { Injectable } from '@nestjs/common';
import { WardrobeCategory } from '@prisma/client';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UploadWardrobeItemDto } from './dto/upload-wardrobe-item.dto';

@Injectable()
export class WardrobeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService
  ) {}

  async getWardrobeItems(userId: string): Promise<unknown[]> {
    return this.prisma.wardrobeItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createWardrobeItem(
    userId: string,
    dto: UploadWardrobeItemDto,
    file: Express.Multer.File
  ): Promise<Record<string, unknown>> {
    const originalImageUrl = await this.storageService.uploadFile(file, 'originals');
    const cutoutImageUrl = await this.aiService.processAndUploadCutout(
      originalImageUrl,
      file.originalname
    );

    return this.prisma.wardrobeItem.create({
      data: {
        userId,
        name: dto.name,
        category: dto.category as WardrobeCategory,
        subcategory: dto.subcategory,
        brand: dto.brand,
        color: dto.color,
        size: dto.size,
        originalImageUrl,
        cutoutImageUrl
      }
    });
  }
}
