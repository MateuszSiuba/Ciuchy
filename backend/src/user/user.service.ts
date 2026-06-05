import { Injectable } from '@nestjs/common';

import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadableFile } from '../storage/storage.service';

const DEMO_USER_ID = 'demo-user-id';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  async getDemoUserProfile(): Promise<Record<string, unknown> | null> {
    return this.prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        basePhotoUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async uploadDemoUserAvatar(file: UploadableFile): Promise<Record<string, unknown>> {
    const avatarUrl = await this.aiService.processAndUploadCutout(file.buffer, file.originalname, 'avatars');

    const publicAvatarUrl = avatarUrl.replace(
      '.storage.supabase.co/storage/v1/s3',
      '.supabase.co/storage/v1/object/public'
    );

    await this.prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      create: {
        id: DEMO_USER_ID,
        email: 'demo-user@ciuchy.local',
        avatarUrl: publicAvatarUrl
      },
      update: {
        avatarUrl: publicAvatarUrl
      }
    });

    const profile = await this.getDemoUserProfile();

    if (!profile) {
      throw new Error('Unable to load the updated demo user profile');
    }

    return profile;
  }
}