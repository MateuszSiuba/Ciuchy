import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AiModule } from './ai/ai.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';

@Module({
  imports: [PrismaModule, StorageModule, AiModule, UserModule, AuthModule, WardrobeModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
