import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AccountAnalytics,
  AnalyticsRange,
  CampaignStat,
  ReferrerStat,
  ResumeRollup,
  TimelinePoint,
} from './analytics.types';
import {
  buildTimeline,
  parseReferer,
  rangeToStartDate,
} from './analytics.util';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Account-wide rollup across every resume the user owns, honouring `range`.
   * Mirrors the per-resume payload shape so the dashboard can swap data sources
   * with no UI change.
   */
  async getAccountAnalytics(
    userId: string,
    range: AnalyticsRange,
  ): Promise<AccountAnalytics> {
    const startDate = rangeToStartDate(range);

    const [resumes, logs] = await Promise.all([
      this.prisma.resume.findMany({
        where: { userId },
        select: { id: true, title: true, slug: true },
      }),
      this.prisma.viewLog.findMany({
        where: {
          resume: { userId },
          ...(startDate ? { viewedAt: { gte: startDate } } : {}),
        },
        orderBy: { viewedAt: 'desc' },
      }),
    ]);

    const viewLogs = logs.filter((log) => log.action === 'VIEW');
    const downloadLogs = logs.filter((log) => log.action === 'DOWNLOAD');

    const uniqueViews = new Set(
      viewLogs.map((log) => log.ipAddress).filter(Boolean),
    ).size;

    return {
      summary: {
        totalViews: viewLogs.length,
        uniqueViews,
        totalDownloads: downloadLogs.length,
      },
      timeline: this.buildAccountTimeline(viewLogs, startDate),
      referrers: this.groupReferrers(viewLogs),
      campaigns: this.groupCampaigns(viewLogs),
      byResume: this.rollupByResume(resumes, viewLogs),
    };
  }

  /**
   * Fixed ranges span their full window even when sparse; `all` spans from the
   * earliest view to today (empty when there are no views yet).
   */
  private buildAccountTimeline(
    viewLogs: { viewedAt: Date }[],
    startDate: Date | null,
  ): TimelinePoint[] {
    const endDate = new Date();
    if (startDate) return buildTimeline(viewLogs, startDate, endDate);

    if (viewLogs.length === 0) return [];
    const earliest = viewLogs.reduce(
      (min, log) => (log.viewedAt < min ? log.viewedAt : min),
      viewLogs[0].viewedAt,
    );
    return buildTimeline(viewLogs, earliest, endDate);
  }

  private groupReferrers(viewLogs: { referer: string | null }[]): ReferrerStat[] {
    const counts: Record<string, number> = {};
    viewLogs.forEach((log) => {
      const source = parseReferer(log.referer);
      counts[source] = (counts[source] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** Tracked-link performance — only labelled (`?for=`) views count here. */
  private groupCampaigns(viewLogs: { label: string | null }[]): CampaignStat[] {
    const counts: Record<string, number> = {};
    viewLogs.forEach((log) => {
      if (!log.label) return;
      counts[log.label] = (counts[log.label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  private rollupByResume(
    resumes: { id: string; title: string; slug: string }[],
    viewLogs: { resumeId: string }[],
  ): ResumeRollup[] {
    const counts: Record<string, number> = {};
    viewLogs.forEach((log) => {
      counts[log.resumeId] = (counts[log.resumeId] || 0) + 1;
    });
    return resumes
      .map((resume) => ({
        id: resume.id,
        title: resume.title,
        slug: resume.slug,
        totalViews: counts[resume.id] || 0,
      }))
      .sort((a, b) => b.totalViews - a.totalViews);
  }
}
