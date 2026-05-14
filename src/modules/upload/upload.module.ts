import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { VersionModule } from '../version/version.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    VersionModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
