import { Injectable, NotFoundException } from '@nestjs/common';
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
   * GET /:username          → latest version of default variant
   * GET /:username/:variant → latest version of named variant
   */
  async getLatest(username: string, variantSlug?: string): Promise<ResolvedResume> {
    const { variant, user } = await this.resolveVariant(username, variantSlug);

    const version = await this.prisma.version.findFirst({
      where: { variantId: variant.id },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version) {
      throw new NotFoundException('No versions found for this resume variant');
    }

    return this.buildResponse(username, variant, version, variant.resume);
  }

  /**
   * GET /:username/:variant/v/:version → specific version
   */
  async getSpecific(
    username: string,
    variantSlug: string,
    versionNumber: number,
  ): Promise<ResolvedResume> {
    const { variant } = await this.resolveVariant(username, variantSlug);

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

  private async resolveVariant(username: string, variantSlug?: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException(`User "${username}" not found`);

    // Find the resume for this user (by username slug convention)
    const resume = await this.prisma.resume.findFirst({
      where: { userId: user.id },
      include: {
        variants: {
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!resume) throw new NotFoundException('No resume found for this user');

    let variant;

    if (variantSlug) {
      variant = await this.prisma.variant.findUnique({
        where: { resumeId_slug: { resumeId: resume.id, slug: variantSlug } },
        include: { resume: true },
      });
      if (!variant) throw new NotFoundException(`Variant "${variantSlug}" not found`);
    } else {
      // Fall back to default variant
      variant = await this.prisma.variant.findFirst({
        where: { resumeId: resume.id, isDefault: true },
        include: { resume: true },
      });
      if (!variant) throw new NotFoundException('Default variant not found');
    }

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
