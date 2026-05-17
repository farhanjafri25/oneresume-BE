import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { VersionModule } from '../version/version.module';

@Module({
  imports: [
    // Store files in memory — buffer is passed directly to UploadThing, nothing hits disk
    MulterModule.register({ storage: memoryStorage() }),
    VersionModule,
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
