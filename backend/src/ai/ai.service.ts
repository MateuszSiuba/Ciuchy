import { Injectable } from '@nestjs/common';
import { removeBackground } from '@imgly/background-removal-node';
import sharp = require('sharp');

import { StorageService } from '../storage/storage.service';

@Injectable()
export class AiService {
  constructor(private readonly storageService: StorageService) {}

  async processAndUploadCutout(imageBuffer: Buffer, fileName: string, folderPath = 'cutouts'): Promise<string> {
    try {
      const mimeType = 'image/png';
      const resolvedFileName = fileName.trim() || 'upload.jpg';
      const normalizedBuffer = await this.normalizeToPng(imageBuffer);
      const imageBlob = new Blob([new Uint8Array(normalizedBuffer)], { type: mimeType });
      const cutoutBlob = await removeBackground(imageBlob);
      const cutoutBuffer = Buffer.from(await cutoutBlob.arrayBuffer());

      return this.storageService.uploadFile(
        {
          buffer: cutoutBuffer,
          originalname: this.ensurePngFileName(resolvedFileName),
          mimetype: mimeType
        },
        folderPath
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown background removal failure';
      throw new Error(`Local background removal failed: ${message}`);
    }
  }

  private async normalizeToPng(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer).rotate().toFormat('png').toBuffer();
  }

  private ensurePngFileName(fileName: string): string {
    const normalizedFileName = fileName.trim() || 'cutout.png';

    if (/\.png$/i.test(normalizedFileName)) {
      return normalizedFileName;
    }

    return `${normalizedFileName.replace(/\.[^/.]+$/, '')}.png`;
  }
}
