import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { ReviewResumeDto } from './dto/review-resume.dto';
import { TailorResumeDto } from './dto/tailor-resume.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  create(@Body() dto: CreateResumeDto) {
    return this.resumeService.create(dto);
  }

  @Get()
  findMyResumes(@CurrentUser() user: AuthenticatedUser) {
    return this.resumeService.findByUserId(user.id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.resumeService.findByUserId(userId);
  }

  @Get('themes')
  getThemes() {
    return this.resumeService.getAvailableThemes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resumeService.findById(id);
  }

  @Get(':id/analytics')
  getAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resumeService.getAnalytics(id, user.id);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewResumeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resumeService.reviewResume(id, dto.jd, user.id);
  }

  @Post(':id/tailor')
  tailor(
    @Param('id') id: string,
    @Body() dto: TailorResumeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resumeService.tailorResume(id, dto.jd, user.id);
  }

  @Post(':id/variants')
  createVariant(
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resumeService.createVariant(id, dto, user.id);
  }  @Post('preview')
  preview(
    @Body() dto: { themeId: string; tailoredData: any },
  ) {
    return this.resumeService.previewResume(dto.themeId, dto.tailoredData);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.resumeService.delete(id);
  }
}
