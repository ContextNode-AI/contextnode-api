import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'prompts');
  private videosDir = path.join(process.cwd(), 'uploads', 'videos');

  constructor(private configService: ConfigService) {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.videosDir)) {
      fs.mkdirSync(this.videosDir, { recursive: true });
    }
  }

  private isCloudinaryConfigured(): boolean {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
    if (cloudinaryUrl && cloudinaryUrl.startsWith('cloudinary://')) {
      return true;
    }
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    return Boolean(cloudName && apiKey && apiSecret);
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    // 1. Try Cloudinary if fully configured
    if (this.isCloudinaryConfigured()) {
      const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
      if (cloudinaryUrl) {
        cloudinary.config(cloudinaryUrl);
      } else {
        cloudinary.config({
          cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
          api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
          api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
          secure: true,
        });
      }

      try {
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'contextnode/prompts',
              resource_type: 'image',
            },
            (error, res) => {
              if (error || !res) return reject(error);
              resolve(res);
            },
          );
          Readable.from(file.buffer).pipe(uploadStream);
        });

        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      } catch (err) {
        console.warn('Cloudinary upload warning, saving locally:', err);
      }
    }

    // 2. Safe local storage fallback
    const ext = path.extname(file.originalname) || '.png';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(this.uploadsDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const port = this.configService.get<string>('PORT') || '3001';
    const baseUrl = `http://localhost:${port}`;
    const localUrl = `${baseUrl}/uploads/prompts/${filename}`;

    return {
      url: localUrl,
      publicId: filename,
    };
  }

  async uploadVideo(file: Express.Multer.File): Promise<{ url: string; publicId: string; posterUrl?: string }> {
    if (!file) {
      throw new BadRequestException('No video file provided for upload');
    }

    // 1. Try Cloudinary if configured
    if (this.isCloudinaryConfigured()) {
      const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
      if (cloudinaryUrl) {
        cloudinary.config(cloudinaryUrl);
      } else {
        cloudinary.config({
          cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
          api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
          api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
          secure: true,
        });
      }

      try {
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'contextnode/videos',
              resource_type: 'video',
            },
            (error, res) => {
              if (error || !res) return reject(error);
              resolve(res);
            },
          );
          Readable.from(file.buffer).pipe(uploadStream);
        });

        // Cloudinary provides automatic video thumbnail posters by swapping extension to jpg
        const posterUrl = result.secure_url
          ? result.secure_url.replace(/\.[^/.]+$/, '.jpg')
          : undefined;

        return {
          url: result.secure_url,
          publicId: result.public_id,
          posterUrl,
        };
      } catch (err) {
        console.warn('Cloudinary video upload warning, saving locally:', err);
      }
    }

    // 2. Safe local storage fallback
    const ext = path.extname(file.originalname) || '.mp4';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(this.videosDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const port = this.configService.get<string>('PORT') || '3001';
    const baseUrl = `http://localhost:${port}`;
    const localUrl = `${baseUrl}/uploads/videos/${filename}`;

    return {
      url: localUrl,
      publicId: filename,
    };
  }
}
