import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { GoogleSignInDto } from './dto/google-sign-in.dto';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
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
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signInWithGoogle(dto: GoogleSignInDto): Promise<Record<string, unknown>> {
    const email = dto.email?.trim().toLowerCase();
    const name = dto.name?.trim();

    if (!email) {
      throw new BadRequestException('Google sign-in requires an email');
    }

    const resolvedName = name || email.split('@')[0] || 'Streetwear Legend';

    return this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: resolvedName,
        displayName: resolvedName,
        avatarUrl: dto.avatarUrl?.trim() || null,
        isGuest: false,
        level: 1,
        drip: 0,
        swag: 0,
        xp: 0
      },
      update: {
        name: resolvedName,
        displayName: resolvedName,
        isGuest: false,
        ...(dto.avatarUrl?.trim() ? { avatarUrl: dto.avatarUrl.trim() } : {})
      },
      select: USER_PROFILE_SELECT
    });
  }

  async signInAsGuest(): Promise<Record<string, unknown>> {
    const guestId = randomUUID();
    const guestName = `Guest ${guestId.slice(0, 8).toUpperCase()}`;

    return this.prisma.user.create({
      data: {
        id: guestId,
        name: guestName,
        displayName: guestName,
        isGuest: true,
        level: 1,
        drip: 0,
        swag: 0,
        xp: 0
      },
      select: USER_PROFILE_SELECT
    });
  }
}