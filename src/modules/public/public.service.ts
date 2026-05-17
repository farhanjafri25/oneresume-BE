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
  async getLatest(username: string, filename: string): Promise<ResolvedResume> {
    const { variant } = await this.resolveVariant(username, filename);

    const version = await this.prisma.version.findFirst({
      where: { variantId: variant.id },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      throw new NotFoundException('No versions found for this resume');
    }

    return this.buildResponse(username, variant, version, variant.resume);
  }

  /**
   * GET /:username/:filename/:version → specific version (e.g. v1)
   */
  async getSpecific(
    username: string,
    filename: string,
    versionParam: string | number,
  ): Promise<ResolvedResume> {
    const { variant } = await this.resolveVariant(username, filename);

    let versionNumber: number;
    if (typeof versionParam === 'string') {
      const stripped = versionParam.startsWith('v') ? versionParam.slice(1) : versionParam;
      versionNumber = parseInt(stripped, 10);
    } else {
      versionNumber = versionParam;
    }

    if (isNaN(versionNumber)) {
      throw new BadRequestException(`Invalid version format: ${versionParam}`);
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

    return this.buildResponse(username, variant, version, variant.resume);
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
