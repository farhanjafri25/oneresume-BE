import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { PrismaService } from '../../prisma/prisma.service';
import { VersionService } from '../version/version.service';
import * as streamifier from 'streamifier';

export interface CloudinaryUploadResult {
  fileUrl: string;
  publicId: string;
  versionNumber: number;
}

@Injectable()
export class UploadService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly versionService: VersionService,
  ) {
    cloudinary.config({
      cloud_name: this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload a PDF buffer to Cloudinary under the correct folder path,
   * then create a version record in the DB.
   *
   * Folder: oneresume/{userId}/{resumeId}/{variantId}/
   * Public ID: oneresume/{userId}/{resumeId}/{variantId}/v{nextVersion}
   */
  async uploadAndCreateVersion(
    file: Express.Multer.File,
    userId: string,
    resumeId: string,
    variantId: string,
  ): Promise<CloudinaryUploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    // Determine next version number upfront so we can name the file
    const latest = await this.prisma.version.findFirst({
      where: { variantId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersion = latest ? latest.versionNumber + 1 : 1;

    const folder = `oneresume/${userId}/${resumeId}/${variantId}`;
    const publicId = `${folder}/v${nextVersion}`;

    // Upload buffer to Cloudinary as a stream
    const uploadResult = await this.uploadStream(file.buffer, {
      public_id: publicId,
      resource_type: 'raw', // PDFs must use raw resource type
      format: 'pdf',
      overwrite: false,
    });

    // Persist the version record
    const version = await this.versionService.create({
      variantId,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });

    return {
      fileUrl: version.fileUrl,
      publicId: version.publicId,
      versionNumber: version.versionNumber,
    };
  }

  private uploadStream(
    buffer: Buffer,
    options: object,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(new InternalServerErrorException(error.message));
          resolve(result);
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
}
