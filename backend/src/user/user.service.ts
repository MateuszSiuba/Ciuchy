import { Injectable, NotFoundException } from '@nestjs/common';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadableFile } from '../storage/storage.service';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  authType: true,
  isGuest: true,
  level: true,
  drip: true,
  swag: true,
  xp: true,
  displayName: true,
  avatarUrl: true,
  basePhotoUrl: true,
  createdAt: true,
  updatedAt: true
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  async getUserProfile(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    return profile;
  }

  async uploadUserAvatar(userId: string, file: UploadableFile): Promise<Record<string, unknown>> {
    const avatarUrl = await this.aiService.processAndUploadCutout(file.buffer, file.originalname, 'avatars');

    const publicAvatarUrl = avatarUrl.replace(
      '.storage.supabase.co/storage/v1/s3',
      '.supabase.co/storage/v1/object/public'
    );

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: publicAvatarUrl
      }
    });

    return this.getUserProfile(userId);
  }
}