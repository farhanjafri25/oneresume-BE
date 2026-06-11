import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class GoogleLoginDto {
  @IsNotEmpty()
  @IsString()
  googleToken: string;

  @IsOptional()
  @IsBoolean()
  isSignUp?: boolean;
}
