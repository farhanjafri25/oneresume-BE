import { IsString, IsUUID } from 'class-validator';

export class UploadResumeDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  resumeId: string;

  @IsUUID()
  variantId: string;
}
