import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new version for a variant.
   * Version numbers auto-increment per variant (no gaps, no overwrites).
   */
  async create(dto: CreateVersionDto) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // Atomically determine the next version number using a transaction
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.version.findFirst({
        where: { variantId: dto.variantId },
        orderBy: { versionNumber: 'desc' },
      });

      const nextVersionNumber = latest ? latest.versionNumber + 1 : 1;

      return tx.version.create({
        data: {
          variantId: dto.variantId,
          versionNumber: nextVersionNumber,
          fileUrl: dto.fileUrl,
          publicId: dto.publicId,
        },
      });
    });
  }

  async findByVariantId(variantId: string) {
    return this.prisma.version.findMany({
      where: { variantId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findSpecific(variantId: string, versionNumber: number) {
    const version = await this.prisma.version.findUnique({
      where: { variantId_versionNumber: { variantId, versionNumber } },
    });
    if (!version) throw new NotFoundException(`Version ${versionNumber} not found`);
    return version;
  }

  async findLatest(variantId: string) {
    const version = await this.prisma.version.findFirst({
      where: { variantId },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version) throw new NotFoundException('No versions found for this variant');
    return version;
  }

  /**
   * Returns the current highest versionNumber for a variant, or null if none exist.
   * Used by UploadService to generate the filename BEFORE the upload occurs.
   * The actual atomic increment is still performed inside create().
   */
  async peekLatestVersionNumber(variantId: string): Promise<number | null> {
    const latest = await this.prisma.version.findFirst({
      where: { variantId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    return latest?.versionNumber ?? null;
  }
}
