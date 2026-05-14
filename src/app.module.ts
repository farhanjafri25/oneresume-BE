import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { ResumeModule } from './modules/resume/resume.module';
import { VariantModule } from './modules/variant/variant.module';
import { VersionModule } from './modules/version/version.module';
import { UploadModule } from './modules/upload/upload.module';
import { PublicModule } from './modules/public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    ResumeModule,
    VariantModule,
    VersionModule,
    UploadModule,
    PublicModule,
  ],
})
export class AppModule {}
