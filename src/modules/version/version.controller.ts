import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { VersionService } from './version.service';
import { CreateVersionDto } from './dto/create-version.dto';

@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  // POST /api/versions  — called after successful upload to confirm a version
  @Post()
  create(@Body() dto: CreateVersionDto) {
    return this.versionService.create(dto);
  }

  // GET /api/versions/variant/:variantId  — list all versions for a variant
  @Get('variant/:variantId')
  findAll(@Param('variantId') variantId: string) {
    return this.versionService.findByVariantId(variantId);
  }

  // GET /api/versions/variant/:variantId/v/:versionNumber
  @Get('variant/:variantId/v/:versionNumber')
  findOne(
    @Param('variantId') variantId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.versionService.findSpecific(variantId, versionNumber);
  }
}
