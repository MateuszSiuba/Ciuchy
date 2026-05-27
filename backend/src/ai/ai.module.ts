import { Module } from '@nestjs/common';

import { StorageModule } from '../storage/storage.module';
import { AiService } from './ai.service';

@Module({
  imports: [StorageModule],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
