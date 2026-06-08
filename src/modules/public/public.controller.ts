import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
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
    @Query('for') forParam: string,
    @Req() req: Request,
  ) {
    const meta = this.extractRequestMeta(req, forParam);
    return this.publicService.getLatest(username, filename, meta);
  }

  // GET /api/:username/:filename/download
  @Get(':username/:filename/download')
  async downloadLatest(
    @Param('username') username: string,
    @Param('filename') filename: string,
    @Query('for') forParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const meta = this.extractRequestMeta(req, forParam);
    const resolved = await this.publicService.trackDownload(username, filename, undefined, meta);
    // Redirect the browser to the actual file URL to initiate the download
    return res.redirect(302, resolved.fileUrl);
  }

  // GET /api/:username/:filename/:version/download
  @Get(':username/:filename/:version/download')
  async downloadSpecific(
    @Param('username') username: string,
    @Param('filename') filename: string,
    @Param('version') version: string,
    @Query('for') forParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const meta = this.extractRequestMeta(req, forParam);
    const resolved = await this.publicService.trackDownload(username, filename, version, meta);
    return res.redirect(302, resolved.fileUrl);
  }

  // GET /api/:username/:filename/:version  → specific version (e.g. v1)
  @Get(':username/:filename/:version')
  getSpecificVersion(
    @Param('username') username: string,
    @Param('filename') filename: string,
    @Param('version') version: string,
    @Query('for') forParam: string,
    @Req() req: Request,
  ) {
    const meta = this.extractRequestMeta(req, forParam);
    return this.publicService.getSpecific(username, filename, version, meta);
  }

  private extractRequestMeta(req: Request, forParam?: string) {
    const country = (req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '') as string;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') as string;
    const userAgent = (req.headers['user-agent'] || '') as string;
    const referer = (req.headers['referer'] || '') as string;

    return { country, ip, userAgent, referer, label: forParam || null };
  }
}
