import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { ReviewResumeDto } from './dto/review-resume.dto';
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

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.resumeService.delete(id);
  }
}
