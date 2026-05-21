import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateResumeDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Find or create based on userId and slug
    const existing = await this.prisma.resume.findUnique({
      where: {
        userId_slug: {
          userId: dto.userId,
          slug: dto.slug,
        },
      },
      include: { variants: true },
    });

    if (existing) {
      return existing;
    }

    const resume = await this.prisma.resume.create({
      data: {
        userId: dto.userId,
        slug: dto.slug,
        title: dto.title || 'Master Resume',
      },
    });

    // Auto-create a default variant
    await this.prisma.variant.create({
      data: {
        resumeId: resume.id,
        slug: 'default',
        isDefault: true,
      },
    });

    return this.prisma.resume.findUnique({
      where: { id: resume.id },
      include: { variants: true },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      include: { variants: { include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { variants: { include: { versions: { orderBy: { versionNumber: 'desc' } } } } },
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async delete(id: string) {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { variants: { include: { versions: true } } },
    });
    if (!resume) throw new NotFoundException('Resume not found');

    // Collect all UploadThing file keys (publicId)
    const fileKeys = resume.variants.flatMap((variant) =>
      variant.versions.map((version) => version.publicId),
    );

    // Delete files from S3 asynchronously
    if (fileKeys.length > 0) {
      await this.uploadService.deleteFiles(fileKeys);
    }

    return this.prisma.resume.delete({ where: { id } });
  }
}
