import { IsNotEmpty, IsObject, IsString, Matches, MinLength } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, hyphens and underscores',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  themeId: string;

  @IsObject()
  @IsNotEmpty()
  tailoredData: any;
}
