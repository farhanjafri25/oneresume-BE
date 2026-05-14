import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Username can only contain lowercase letters, numbers, hyphens and underscores',
  })
  username: string;

  @IsEmail()
  email: string;
}
