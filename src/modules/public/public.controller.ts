import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
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
    @Req() req: Request,
  ) {
    const meta = this.extractRequestMeta(req);
    return this.publicService.getLatest(username, filename, meta);
  }

  // GET /api/:username/:filename/:version  → specific version (e.g. v1)
  @Get(':username/:filename/:version')
  getSpecificVersion(
    @Param('username') username: string,
    @Param('filename') filename: string,
    @Param('version') version: string,
    @Req() req: Request,
  ) {
    const meta = this.extractRequestMeta(req);
    return this.publicService.getSpecific(username, filename, version, meta);
  }

  private extractRequestMeta(req: Request) {
    const country = (req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '') as string;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const userAgent = (req.headers['user-agent'] || '') as string;
    const referer = (req.headers['referer'] || '') as string;

    return { country, ip, userAgent, referer };
  }
}
