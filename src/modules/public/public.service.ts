import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ResolvedResume {
  username: string;
  variant: string;
  versionNumber: number;
  fileUrl: string;
  publicId: string;
  totalVersions: number;
  allVariants: string[];
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /:username/:filename → latest version of default variant of that filename
   */
  async getLatest(username: string, filename: string, meta?: any): Promise<ResolvedResume> {
    const { variant } = await this.resolveVariant(username, filename);

    const version = await this.prisma.version.findFirst({
      where: { variantId: variant.id },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      throw new NotFoundException('No versions found for this resume');
    }

    if (meta) {
      this.logViewAsync(variant.resumeId, variant.id, version.versionNumber, meta);
    }

    return this.buildResponse(username, variant, version, variant.resume);
  }

  /**
   * GET /:username/:filename/:version → specific version (e.g. v1) or variant slug (e.g. meltplanpvtltd-optimized)
   */
  async getSpecific(
    username: string,
    filename: string,
    versionParam: string | number,
    meta?: any,
  ): Promise<ResolvedResume> {
    try {
      // 1. Try to resolve versionParam as a variant slug first
      if (typeof versionParam === 'string') {
        const { variant } = await this.resolveVariant(username, filename, versionParam);
        
        const version = await this.prisma.version.findFirst({
          where: { variantId: variant.id },
          orderBy: { versionNumber: 'desc' },
        });

        if (!version) {
          throw new NotFoundException(`No versions found for variant "${versionParam}"`);
        }

        if (meta) {
          this.logViewAsync(variant.resumeId, variant.id, version.versionNumber, meta, 'VIEW');
        }

        return this.buildResponse(username, variant, version, variant.resume);
      }
    } catch (err) {
      // If it wasn't found as a variant, continue and try to parse as a version number of the default variant
      if (!(err instanceof NotFoundException && err.message.includes('Variant'))) {
        throw err;
      }
    }

    // 2. Fall back: treat versionParam as a version number of the default variant
    const { variant } = await this.resolveVariant(username, filename, 'default');

    let versionNumber: number;
    if (typeof versionParam === 'string') {
      const stripped = versionParam.startsWith('v') ? versionParam.slice(1) : versionParam;
      versionNumber = parseInt(stripped, 10);
    } else {
      versionNumber = versionParam;
    }

    if (isNaN(versionNumber)) {
      throw new BadRequestException(`Invalid version or variant format: ${versionParam}`);
    }

    const version = await this.prisma.version.findUnique({
      where: {
        variantId_versionNumber: {
          variantId: variant.id,
          versionNumber,
        },
      },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    if (meta) {
      this.logViewAsync(variant.resumeId, variant.id, version.versionNumber, meta);
    }

    return this.buildResponse(username, variant, version, variant.resume);
  }

  private async logViewAsync(
    resumeId: string,
    variantId: string,
    versionNumber: number,
    meta: { country?: string; ip?: string; userAgent?: string; referer?: string; label?: string },
    action: string = 'VIEW',
  ) {
    try {
      // Basic IP anonymizer (mask last octet for visitor privacy compliance)
      let ipAddress = meta.ip || null;
      if (ipAddress && ipAddress.includes('.')) {
        ipAddress = ipAddress.substring(0, ipAddress.lastIndexOf('.')) + '.0';
      }

      await this.prisma.viewLog.create({
        data: {
          resumeId,
          variantId,
          versionNumber,
          ipAddress,
          country: meta.country || null,
          userAgent: meta.userAgent || null,
          referer: meta.referer || null,
          label: meta.label || null,
          action,
        },
      });
    } catch (error) {
      console.error('Failed to log resume view:', error);
    }
  }

  async trackDownload(
    username: string,
    filename: string,
    versionParam: string | number | undefined,
    meta?: any,
  ): Promise<ResolvedResume> {
    const resolved = versionParam
      ? await this.getSpecific(username, filename, versionParam, null) // Pass null meta to avoid duplicate VIEW log
      : await this.getLatest(username, filename, null);
    
    // Log the download specifically
    const { variant } = await this.resolveVariant(username, filename, resolved.variant);
    if (meta) {
      this.logViewAsync(variant.resumeId, variant.id, resolved.versionNumber, meta, 'DOWNLOAD');
    }

    return resolved;
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async resolveVariant(username: string, filename: string, variantSlug = 'default') {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException(`User "${username}" not found`);

    // Find the specific resume for this user matching the filename (resume slug)
    const resume = await this.prisma.resume.findUnique({
      where: {
        userId_slug: {
          userId: user.id,
          slug: filename,
        },
      },
      include: {
        variants: {
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!resume) throw new NotFoundException(`Resume "${filename}" not found for user "${username}"`);

    // Find the default variant or specific variant of this resume
    const variant = await this.prisma.variant.findUnique({
      where: {
        resumeId_slug: {
          resumeId: resume.id,
          slug: variantSlug,
        },
      },
      include: { resume: true },
    });

    if (!variant) throw new NotFoundException(`Variant "${variantSlug}" not found`);

    return { variant, user, resume };
  }

  private async buildResponse(
    username: string,
    variant: any,
    version: any,
    resume: any,
  ): Promise<ResolvedResume> {
    const totalVersions = await this.prisma.version.count({
      where: { variantId: variant.id },
    });

    const allVariants = await this.prisma.variant.findMany({
      where: { resumeId: variant.resumeId },
      select: { slug: true },
      orderBy: { slug: 'asc' },
    });

    return {
      username,
      variant: variant.slug,
      versionNumber: version.versionNumber,
      fileUrl: version.fileUrl,
      publicId: version.publicId,
      totalVersions,
      allVariants: allVariants.map((v) => v.slug),
    };
  }
}
// triggered dev watch update
