import { IsNotEmpty, IsString } from 'class-validator';

export class TailorResumeDto {
  @IsNotEmpty()
  @IsString()
  jd: string;
}
