import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { RegisterDto } from './dto/register.dto';

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

const LOGIN_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  password: true,
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
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<Record<string, unknown>> {
    const email = dto.email?.trim().toLowerCase();
    const name = dto.name?.trim();
    const password = dto.password?.trim();

    if (!email || !name || !password) {
      throw new BadRequestException('Registration requires name, email, and password');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        authType: 'EMAIL',
        name,
        displayName: name,
        isGuest: false,
        level: 1,
        drip: 0,
        swag: 0,
        xp: 0
      },
      select: USER_PROFILE_SELECT
    });
  }

  async login(dto: LoginDto): Promise<Record<string, unknown>> {
    const email = dto.email?.trim().toLowerCase();
    const plainPassword = dto.password?.trim();

    if (!email || !plainPassword) {
      throw new BadRequestException('Login requires email and password');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: LOGIN_USER_SELECT
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(plainPassword, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _password, ...publicProfile } = user;
    return publicProfile;
  }

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
        authType: 'GOOGLE',
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
        authType: 'GOOGLE',
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
        authType: 'GUEST',
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