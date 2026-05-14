import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';

@Injectable()
export class ResumeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateResumeDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check slug uniqueness
    const existing = await this.prisma.resume.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Resume slug already taken');

    const resume = await this.prisma.resume.create({
      data: { userId: dto.userId, slug: dto.slug },
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
}
