import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class VariantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantDto) {
    // Verify resume exists
    const resume = await this.prisma.resume.findUnique({ where: { id: dto.resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');

    // Slug must be unique within this resume
    const existing = await this.prisma.variant.findUnique({
      where: { resumeId_slug: { resumeId: dto.resumeId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException(`Variant "${dto.slug}" already exists for this resume`);

    return this.prisma.variant.create({
      data: {
        resumeId: dto.resumeId,
        slug: dto.slug,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async findByResumeId(resumeId: string) {
    return this.prisma.variant.findMany({
      where: { resumeId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
      orderBy: { slug: 'asc' },
    });
  }

  async findById(id: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }
}
