import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AiModule } from './ai/ai.module';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';

@Module({
  imports: [PrismaModule, StorageModule, AiModule, WardrobeModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
