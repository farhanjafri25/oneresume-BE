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

  async getAnalytics(resumeId: string, userId: string) {
    // Verify the resume belongs to the user
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
    });
    if (!resume) throw new NotFoundException('Resume not found');

    const logs = await this.prisma.viewLog.findMany({
      where: { resumeId },
      orderBy: { viewedAt: 'desc' },
    });

    // Calculate stats
    const totalViews = logs.length;
    const uniqueIps = new Set(logs.map((log) => log.ipAddress).filter(Boolean));
    const uniqueViews = uniqueIps.size;

    // 1. Group Views by Referrer
    const referrers: Record<string, number> = {};
    logs.forEach((log) => {
      const ref = this.parseReferer(log.referer);
      referrers[ref] = (referrers[ref] || 0) + 1;
    });

    // 2. Group Views by Device Type
    let mobile = 0, desktop = 0, tablet = 0;
    logs.forEach((log) => {
      const ua = (log.userAgent || '').toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        mobile++;
      } else if (ua.includes('ipad') || ua.includes('tablet')) {
        tablet++;
      } else {
        desktop++;
      }
    });

    // 3. Group Views by Day (Last 30 Days Timeline)
    const timeline: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      timeline[dayKey] = 0;
    }
    logs.forEach((log) => {
      const dayKey = log.viewedAt.toISOString().split('T')[0];
      if (dayKey in timeline) {
        timeline[dayKey]++;
      }
    });

    return {
      summary: { totalViews, uniqueViews, desktop, mobile, tablet },
      referrers: Object.entries(referrers).map(([source, count]) => ({ source, count })),
      timeline: Object.entries(timeline).map(([date, count]) => ({ date, count })),
      recentLogs: logs.slice(0, 15).map((log) => ({
        id: log.id,
        viewedAt: log.viewedAt,
        country: log.country,
        referer: this.parseReferer(log.referer),
        browser: this.parseBrowser(log.userAgent),
      })),
    };
  }

  private parseReferer(referer: string | null): string {
    if (!referer) return 'Direct / Email';
    const url = referer.toLowerCase();
    if (url.includes('linkedin')) return 'LinkedIn';
    if (url.includes('indeed')) return 'Indeed';
    if (url.includes('github')) return 'GitHub';
    if (url.includes('google')) return 'Google Search';
    try {
      return new URL(referer).hostname || 'Other';
    } catch {
      return 'Other';
    }
  }

  private parseBrowser(ua: string | null): string {
    if (!ua) return 'Unknown';
    const lowercase = ua.toLowerCase();
    if (lowercase.includes('chrome')) return 'Chrome';
    if (lowercase.includes('safari')) return 'Safari';
    if (lowercase.includes('firefox')) return 'Firefox';
    if (lowercase.includes('edge')) return 'Edge';
    return 'Other';
  }
}
