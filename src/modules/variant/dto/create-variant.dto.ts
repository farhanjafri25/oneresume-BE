import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateVariantDto {
  @IsUUID()
  resumeId: string;

  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, hyphens and underscores',
  })
  slug: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
