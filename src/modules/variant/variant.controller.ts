import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';

@Controller('resumes/:resumeId/variants')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  create(
    @Param('resumeId') resumeId: string,
    @Body() dto: CreateVariantDto,
  ) {
    dto.resumeId = resumeId; // override from URL
    return this.variantService.create(dto);
  }

  @Get()
  findAll(@Param('resumeId') resumeId: string) {
    return this.variantService.findByResumeId(resumeId);
  }

  @Get(':variantId')
  findOne(@Param('variantId') variantId: string) {
    return this.variantService.findById(variantId);
  }
}
