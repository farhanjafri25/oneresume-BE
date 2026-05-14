import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // GET /api/:username  → latest default variant
  @Get(':username')
  getDefaultLatest(@Param('username') username: string) {
    return this.publicService.getLatest(username);
  }

  // GET /api/:username/:variant  → latest of named variant
  @Get(':username/:variant')
  getVariantLatest(
    @Param('username') username: string,
    @Param('variant') variant: string,
  ) {
    return this.publicService.getLatest(username, variant);
  }

  // GET /api/:username/:variant/v/:version  → specific version
  @Get(':username/:variant/v/:version')
  getSpecificVersion(
    @Param('username') username: string,
    @Param('variant') variant: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.publicService.getSpecific(username, variant, version);
  }
}
