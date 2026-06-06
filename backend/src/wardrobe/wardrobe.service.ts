import { Injectable, NotFoundException } from '@nestjs/common';
import { WardrobeCategory, WardrobeItem } from '@prisma/client';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadableFile } from '../storage/storage.service';
import { UploadWardrobeItemDto } from './dto/upload-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';

const DEFAULT_LATITUDE = 52.7368;
const DEFAULT_LONGITUDE = 15.2288;
const BRAND_REWARDS: Record<string, { xp: number; drip: number; swag: number }> = {
  nike: { xp: 18, drip: 3, swag: 2 },
  adidas: { xp: 16, drip: 2, swag: 2 },
  jordan: { xp: 24, drip: 4, swag: 3 },
  puma: { xp: 14, drip: 2, swag: 1 },
  supreme: { xp: 30, drip: 5, swag: 5 },
  stussy: { xp: 22, drip: 4, swag: 3 },
  carhartt: { xp: 20, drip: 2, swag: 4 },
  'ralph lauren': { xp: 20, drip: 3, swag: 3 },
  balenciaga: { xp: 34, drip: 6, swag: 4 },
  'off-white': { xp: 32, drip: 6, swag: 5 },
  'mihara yasuhiro': { xp: 28, drip: 5, swag: 4 },
  other: { xp: 12, drip: 1, swag: 1 }
};

type TemperatureBand = 'warm' | 'cool';
type WeatherResponse = {
  temperature: number;
  weatherCode: number | null;
};

@Injectable()
export class WardrobeService {
  private weatherCache: WeatherResponse | null = null;
  private lastWeatherFetch = 0;
  private weatherCacheKey = '';
  private readonly CACHE_TTL = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService
  ) {}

  async getWardrobeItems(userId: string): Promise<unknown[]> {
    await this.ensureUserExists(userId);

    return this.prisma.wardrobeItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getDailySuggestion(userId: string, lat?: string, lon?: string): Promise<Record<string, unknown>> {
    await this.ensureUserExists(userId);
    const weather = await this.fetchCurrentWeather(lat, lon);
    const temperatureBand: TemperatureBand = weather.temperature >= 20 ? 'warm' : 'cool';

    const [top, bottom, footwear] = await Promise.all([
      this.pickSuggestedItem(userId, WardrobeCategory.TOP, temperatureBand),
      this.pickSuggestedItem(userId, WardrobeCategory.BOTTOM, temperatureBand),
      this.pickSuggestedItem(userId, WardrobeCategory.FOOTWEAR, temperatureBand)
    ]);

    return {
      temperature: weather.temperature,
      weatherCode: weather.weatherCode,
      suggestedOutfit: [top, bottom, footwear].filter((item): item is WardrobeItem => item !== null)
    };
  }

  async createWardrobeItem(
    userId: string,
    dto: UploadWardrobeItemDto,
    file: UploadableFile
  ): Promise<Record<string, unknown>> {
    const user = await this.ensureUserExists(userId);

    const originalImageUrl = await this.storageService.uploadFile(file, 'originals');
    const cutoutImageUrl = await this.aiService.processAndUploadCutout(
      file.buffer,
      file.originalname
    );

    const publicOriginalUrl = originalImageUrl.replace('.storage.supabase.co/storage/v1/s3', '.supabase.co/storage/v1/object/public');
    const publicCutoutUrl = cutoutImageUrl.replace('.storage.supabase.co/storage/v1/s3', '.supabase.co/storage/v1/object/public');

    const brandReward = this.resolveBrandReward(dto.brand);

    const nextXpTotal = user.xp + brandReward.xp;
    const levelGained = Math.floor(nextXpTotal / 100) - Math.floor(user.xp / 100);
    const nextUserLevel = user.level + levelGained;
    const nextXp = nextXpTotal % 100;

    const [createdItem, updatedUser] = await this.prisma.$transaction([
      this.prisma.wardrobeItem.create({
        data: {
          userId,
          name: dto.name,
          category: dto.category as WardrobeCategory,
          subcategory: dto.subcategory,
          brand: dto.brand,
          color: dto.color,
          size: dto.size,
          originalImageUrl: publicOriginalUrl,
          cutoutImageUrl: publicCutoutUrl
        }
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          drip: { increment: brandReward.drip },
          swag: { increment: brandReward.swag },
          xp: nextXp,
          level: nextUserLevel
        },
        select: {
          id: true,
          email: true,
          name: true,
          isGuest: true,
          level: true,
          drip: true,
          swag: true,
          xp: true,
          avatarUrl: true,
          basePhotoUrl: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    return {
      item: createdItem,
      user: updatedUser
    };
  }

  async updateWardrobeItem(userId: string, id: string, dto: UpdateWardrobeItemDto): Promise<WardrobeItem> {
    await this.ensureUserExists(userId);

    const result = await this.prisma.wardrobeItem.updateMany({
      where: {
        id,
        userId
      },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.category !== undefined ? { category: dto.category as WardrobeCategory } : {}),
        ...(dto.subcategory !== undefined ? { subcategory: dto.subcategory } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.size !== undefined ? { size: dto.size } : {})
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Wardrobe item not found');
    }

    const updatedItem = await this.prisma.wardrobeItem.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!updatedItem) {
      throw new NotFoundException('Wardrobe item not found');
    }

    return updatedItem;
  }

  async deleteWardrobeItem(userId: string, id: string): Promise<Record<string, boolean>> {
    await this.ensureUserExists(userId);

    const result = await this.prisma.wardrobeItem.deleteMany({
      where: {
        id,
        userId
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Wardrobe item not found');
    }

    return { success: true };
  }

  private async fetchCurrentWeather(
    lat?: string,
    lon?: string
  ): Promise<WeatherResponse> {
    const now = Date.now();
    const weatherQuery = this.buildWeatherQuery(lat, lon);

    if (this.weatherCache !== null && this.weatherCacheKey === weatherQuery && now - this.lastWeatherFetch < this.CACHE_TTL) {
      return this.weatherCache;
    }

    const weatherApiKey = process.env.WEATHER_API_KEY ?? '';
    const weatherApiUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${encodeURIComponent(weatherQuery)}&aqi=no`;

    try {
      const response = await fetch(weatherApiUrl);

      if (!response.ok) {
        throw new Error(`Weather fetch failed: ${response.status}`);
      }

      const payload = (await response.json()) as {
        current?: { temp_c?: number; condition?: { code?: number } };
      };

      const temperature = payload.current?.temp_c;

      if (typeof temperature !== 'number') {
        throw new Error('Weather response missing temperature');
      }

      const freshWeather: WeatherResponse = {
        temperature,
        weatherCode: typeof payload.current?.condition?.code === 'number' ? payload.current.condition.code : null
      };

      this.weatherCache = freshWeather;
      this.lastWeatherFetch = now;
      this.weatherCacheKey = weatherQuery;

      return freshWeather;
    } catch (error) {
      console.warn('Weather fetch failed, using cached or fallback data:', error);

      if (this.weatherCache !== null) {
        return this.weatherCache;
      }

      return {
        temperature: 20,
        weatherCode: null
      };
    }
  }

  private buildWeatherQuery(lat?: string, lon?: string): string {
    if (lat !== undefined && lon !== undefined) {
      const latitude = this.parseCoordinate(lat, DEFAULT_LATITUDE);
      const longitude = this.parseCoordinate(lon, DEFAULT_LONGITUDE);
      return `${latitude},${longitude}`;
    }

    return 'auto:ip';
  }

  private parseCoordinate(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private async pickSuggestedItem(
    userId: string,
    category: WardrobeCategory,
    temperatureBand: TemperatureBand
  ): Promise<WardrobeItem | null> {
    const allItemsInCategory = await this.prisma.wardrobeItem.findMany({
      where: {
        userId,
        category
      }
    });

    if (allItemsInCategory.length === 0) {
      return null;
    }

    const filtered = allItemsInCategory.filter((item) => this.matchesTemperatureHeuristic(item, temperatureBand));
    const pool = filtered.length > 0 ? filtered : allItemsInCategory;

    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  private matchesTemperatureHeuristic(item: WardrobeItem, temperatureBand: TemperatureBand): boolean {
    const searchText = [item.name, item.subcategory, item.color, ...(item.tags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const warmKeywords = /t-?shirt|tee|shorts|tank|linen|light|summer|sneaker/;
    const coolKeywords = /hoodie|sweater|long|jacket|coat|pants|jeans|boot|winter/;

    if (temperatureBand === 'warm') {
      return warmKeywords.test(searchText);
    }

    return coolKeywords.test(searchText);
  }

  private async ensureUserExists(userId: string): Promise<{ id: string; level: number; xp: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, xp: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private resolveBrandReward(brand?: string): { xp: number; drip: number; swag: number } {
    const normalizedBrand = brand?.trim().toLowerCase();

    if (!normalizedBrand) {
      return BRAND_REWARDS.other;
    }

    return BRAND_REWARDS[normalizedBrand] ?? BRAND_REWARDS.other;
  }
}
