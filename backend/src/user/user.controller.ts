import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UploadableFile } from '../storage/storage.service';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(): Promise<Record<string, unknown> | null> {
    return this.userService.getDemoUserProfile();
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('image'))
  uploadAvatar(@UploadedFile() file: UploadableFile): Promise<Record<string, unknown> | null> {
    return this.userService.uploadDemoUserAvatar(file);
  }
}