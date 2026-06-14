import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { UserModule } from './modules/user/user.module';
import { ResumeModule } from './modules/resume/resume.module';
import { VariantModule } from './modules/variant/variant.module';
import { VersionModule } from './modules/version/version.module';
import { UploadModule } from './modules/upload/upload.module';
import { PublicModule } from './modules/public/public.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    ResumeModule,
    VariantModule,
    VersionModule,
    UploadModule,
    PublicModule,
    AnalyticsModule,
  ],
  providers: [
    {
      // Apply JwtAuthGuard to ALL routes globally.
      // Use @Public() decorator on any route that should be open.
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
