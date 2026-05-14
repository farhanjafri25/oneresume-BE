import { IsString, IsUUID, Matches, MinLength } from 'class-validator';

export class CreateResumeDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, hyphens and underscores',
  })
  slug: string;
}
