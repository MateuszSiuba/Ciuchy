import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeService } from './wardrobe.service';

@Module({
  imports: [StorageModule, AiModule],
  controllers: [WardrobeController],
  providers: [WardrobeService]
})
export class WardrobeModule {}
