import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateVersionDto {
  @IsUUID()
  variantId: string;

  @IsString()
  fileUrl: string;

  @IsString()
  publicId: string;
}
