import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../auth/decorators/public.decorator';

@Public() // all resume viewer routes are open — no auth required
@Controller()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  // GET /api/:username/:filename  → latest version of default variant of this resume
  @Get(':username/:filename')
  getLatestResume(
    @Param('username') username: string,
    @Param('filename') filename: string,
  ) {
    return this.publicService.getLatest(username, filename);
  }

  // GET /api/:username/:filename/:version  → specific version (e.g. v1)
  @Get(':username/:filename/:version')
  getSpecificVersion(
    @Param('username') username: string,
    @Param('filename') filename: string,
    @Param('version') version: string,
  ) {
    return this.publicService.getSpecific(username, filename, version);
  }
}
