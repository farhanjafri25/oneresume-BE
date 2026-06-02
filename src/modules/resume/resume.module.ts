import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { UploadModule } from '../upload/upload.module';
import { AiService } from './ai.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [UploadModule],
  controllers: [ResumeController],
  providers: [ResumeService, AiService, PdfGeneratorService],
  exports: [ResumeService],
})
export class ResumeModule {}
