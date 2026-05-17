import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadResumeDto } from './dto/upload-resume.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/upload
   *
   * Multipart form-data:
   *   - file      : PDF file (required, max 10 MB)
   *   - userId    : UUID
   *   - resumeId  : UUID
   *   - variantId : UUID
   *
   * Returns: { fileUrl, fileKey, versionNumber }
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadResumeDto,
  ) {
    if (!file) throw new BadRequestException('A PDF file is required');

    return this.uploadService.uploadAndCreateVersion(
      file,
      dto.userId,
      dto.resumeId,
      dto.variantId,
    );
  }
}
