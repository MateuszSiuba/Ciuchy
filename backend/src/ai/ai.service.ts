import { Injectable } from '@nestjs/common';

import { StorageService } from '../storage/storage.service';

@Injectable()
export class AiService {
  constructor(private readonly storageService: StorageService) {}

  async processAndUploadCutout(originalImageUrl: string, fileName: string): Promise<string> {
    const apiKey = process.env.PHOTOROOM_API_KEY;

    if (!apiKey) {
      throw new Error('PHOTOROOM_API_KEY is not configured');
    }

    const response = await fetch('https://image-api.photoroom.com/v2/edit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: originalImageUrl,
        outputFormat: 'png'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Photoroom cutout failed: ${response.status} ${errorText}`);
    }

    const cutoutBuffer = Buffer.from(await response.arrayBuffer());

    return this.storageService.uploadFile(
      {
        buffer: cutoutBuffer,
        originalname: this.ensurePngFileName(fileName),
        mimetype: 'image/png'
      },
      'cutouts'
    );
  }

  private ensurePngFileName(fileName: string): string {
    const normalizedFileName = fileName.trim() || 'cutout.png';

    if (/\.png$/i.test(normalizedFileName)) {
      return normalizedFileName;
    }

    return `${normalizedFileName.replace(/\.[^/.]+$/, '')}.png`;
  }
}
