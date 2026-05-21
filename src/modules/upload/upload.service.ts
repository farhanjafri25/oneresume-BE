import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UTApi, UTFile } from 'uploadthing/server';
import { VersionService } from '../version/version.service';

export interface UploadResult {
  fileUrl: string;
  fileKey: string;
  versionNumber: number;
}

@Injectable()
export class UploadService {
  private readonly utapi: UTApi;

  constructor(
    private readonly config: ConfigService,
    private readonly versionService: VersionService,
  ) {
    this.utapi = new UTApi({
      token: this.config.getOrThrow<string>('UPLOADTHING_TOKEN'),
    });
  }

  /**
   * Receives a PDF buffer from Multer, uploads it to UploadThing via UTApi,
   * then creates and returns the new Version record.
   *
   * File naming convention: {userId}/{resumeId}/{variantId}/v{nextVersion}.pdf
   */
  async uploadAndCreateVersion(
    file: Express.Multer.File,
    userId: string,
    resumeId: string,
    variantId: string,
  ): Promise<UploadResult> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    // Determine next version number to bake into the filename
    const latest = await this.versionService.peekLatestVersionNumber(variantId);
    const nextVersion = latest !== null ? latest + 1 : 1;

    const fileName = `${userId}/${resumeId}/${variantId}/v${nextVersion}.pdf`;

    // UTFile expects BlobPart[] — convert Node Buffer to a plain ArrayBuffer
    const arrayBuffer = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength,
    ) as ArrayBuffer;

    const utFile = new UTFile([arrayBuffer], fileName, {
      type: 'application/pdf',
    });

    const response = await this.utapi.uploadFiles(utFile);

    if (response.error) {
      throw new InternalServerErrorException(
        `UploadThing error: ${response.error.message}`,
      );
    }

    const { url, key } = response.data;

    // Persist the version record in DB
    const version = await this.versionService.create({
      variantId,
      fileUrl: url,
      publicId: key, // stored as publicId in schema (renamed below in DB)
    });

    return {
      fileUrl: version.fileUrl,
      fileKey: version.publicId,
      versionNumber: version.versionNumber,
    };
  }

  /**
   * Deletes one or multiple files from UploadThing (S3).
   */
  async deleteFiles(fileKeys: string | string[]): Promise<void> {
    try {
      if (Array.isArray(fileKeys) && fileKeys.length === 0) return;
      await this.utapi.deleteFiles(fileKeys);
    } catch (err) {
      console.error('Failed to delete files from UploadThing:', err);
    }
  }
}
