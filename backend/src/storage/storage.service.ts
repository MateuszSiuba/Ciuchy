import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export type UploadableFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor() {
    this.region = process.env.AWS_REGION ?? 'us-east-1';
    this.endpoint = process.env.AWS_S3_ENDPOINT;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME ?? '';

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? ''
      },
      forcePathStyle: Boolean(this.endpoint)
    });
  }

  async uploadFile(file: UploadableFile, folderPath: string): Promise<string> {
    const safeFolderPath = folderPath.replace(/^\/+|\/+$/g, '');
    const fileExtension = extname(file.originalname);
    const objectKey = `${safeFolderPath}/${randomUUID()}${fileExtension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    return this.buildPublicUrl(objectKey);
  }

  private buildPublicUrl(objectKey: string): string {
    if (this.endpoint) {
      const normalizedEndpoint = this.endpoint.replace(/\/+$/g, '');
      return `${normalizedEndpoint}/${this.bucketName}/${objectKey}`;
    }

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${objectKey}`;
  }
}
