import { Injectable, NotFoundException } from '@nestjs/common';
import { WardrobeCategory, WardrobeItem } from '@prisma/client';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UploadableFile } from '../storage/storage.service';
import { UploadWardrobeItemDto } from './dto/upload-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';

const DEMO_USER_ID = 'demo-user-id';
const DEFAULT_LATITUDE = 52.7368;
const DEFAULT_LONGITUDE = 15.2288;

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

  async getWardrobeItems(): Promise<unknown[]> {
    return this.prisma.wardrobeItem.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getDailySuggestion(lat?: string, lon?: string): Promise<Record<string, unknown>> {
    const weather = await this.fetchCurrentWeather(lat, lon);
    const temperatureBand: TemperatureBand = weather.temperature >= 20 ? 'warm' : 'cool';

    const [top, bottom, footwear] = await Promise.all([
      this.pickSuggestedItem(WardrobeCategory.TOP, temperatureBand),
      this.pickSuggestedItem(WardrobeCategory.BOTTOM, temperatureBand),
      this.pickSuggestedItem(WardrobeCategory.FOOTWEAR, temperatureBand)
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

    console.log('MOJE ID TO:', userId);

    const originalImageUrl = await this.storageService.uploadFile(file, 'originals');
    const cutoutImageUrl = await this.aiService.processAndUploadCutout(
      file.buffer,
      file.originalname
    );

    const publicOriginalUrl = originalImageUrl.replace('.storage.supabase.co/storage/v1/s3', '.supabase.co/storage/v1/object/public');
    const publicCutoutUrl = cutoutImageUrl.replace('.storage.supabase.co/storage/v1/s3', '.supabase.co/storage/v1/object/public');

    return this.prisma.wardrobeItem.create({
      data: {
        userId,
        name: dto.name,
        category: dto.category as WardrobeCategory,
        subcategory: dto.subcategory,
        brand: dto.brand,
        color: dto.color,
        size: dto.size,
        originalImageUrl: publicOriginalUrl, // <--- zmienione
        cutoutImageUrl: publicCutoutUrl      // <--- zmienione
      }
    });
  }

  async updateWardrobeItem(id: string, dto: UpdateWardrobeItemDto): Promise<WardrobeItem> {
    const result = await this.prisma.wardrobeItem.updateMany({
      where: {
        id,
        userId: DEMO_USER_ID
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
        userId: DEMO_USER_ID
      }
    });

    if (!updatedItem) {
      throw new NotFoundException('Wardrobe item not found');
    }

    return updatedItem;
  }

  async deleteWardrobeItem(id: string): Promise<Record<string, boolean>> {
    const result = await this.prisma.wardrobeItem.deleteMany({
      where: {
        id,
        userId: DEMO_USER_ID
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
    category: WardrobeCategory,
    temperatureBand: TemperatureBand
  ): Promise<WardrobeItem | null> {
    const allItemsInCategory = await this.prisma.wardrobeItem.findMany({
      where: {
        userId: DEMO_USER_ID,
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
}
