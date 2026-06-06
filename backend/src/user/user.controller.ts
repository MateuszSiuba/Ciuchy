import { BadRequestException, Controller, Get, Headers, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadableFile } from '../storage/storage.service';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Headers('x-user-id') headerUserId?: string, @Query('userId') queryUserId?: string): Promise<Record<string, unknown>> {
    const userId = this.resolveUserId(headerUserId, queryUserId);
    return this.userService.getUserProfile(userId);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('image'))
  uploadAvatar(
    @UploadedFile() file: UploadableFile,
    @Headers('x-user-id') headerUserId?: string,
    @Query('userId') queryUserId?: string
  ): Promise<Record<string, unknown>> {
    const userId = this.resolveUserId(headerUserId, queryUserId);
    return this.userService.uploadUserAvatar(userId, file);
  }

  private resolveUserId(headerUserId?: string, queryUserId?: string): string {
    const userId = headerUserId?.trim() || queryUserId?.trim();

    if (!userId) {
      throw new BadRequestException('Missing userId');
    }

    return userId;
  }
}