import { IsNotEmpty, IsString } from 'class-validator';

export class ReviewResumeDto {
  @IsNotEmpty()
  @IsString()
  jd: string;
}
