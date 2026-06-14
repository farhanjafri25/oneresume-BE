import { AnalyticsRange, DeviceType, TimelinePoint } from './analytics.types';

/**
 * Pure analytics helpers shared by the per-resume and account-wide endpoints.
 * Kept free of NestJS/Prisma so both services derive identical fields and the
 * logic stays unit-testable in isolation.
 *
 * The server runs in Asia/Kolkata (see main bootstrap), so calendar-day stepping
 * and IST formatting line up — day buckets are computed in IST throughout.
 */

const IST_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD in Asia/Kolkata. */
export function dayKey(date: Date): string {
  return IST_DAY_FORMATTER.format(date);
}

/** Number of days in a fixed range window; `null` for the unbounded `all`. */
const RANGE_DAYS: Record<Exclude<AnalyticsRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * Inclusive lower bound for a range, or `null` for `all`.
 * A 7d range covers today plus the 6 prior days, so we step back `days - 1`.
 */
export function rangeToStartDate(
  range: AnalyticsRange,
  now: Date = new Date(),
): Date | null {
  if (range === 'all') return null;
  const start = new Date(now);
  start.setDate(start.getDate() - (RANGE_DAYS[range] - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

export function parseReferer(referer: string | null): string {
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

export function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown';
  const lowercase = ua.toLowerCase();
  if (lowercase.includes('chrome')) return 'Chrome';
  if (lowercase.includes('safari')) return 'Safari';
  if (lowercase.includes('firefox')) return 'Firefox';
  if (lowercase.includes('edge')) return 'Edge';
  return 'Other';
}

export function classifyDevice(ua: string | null): DeviceType {
  const lower = (ua || '').toLowerCase();
  if (lower.includes('ipad') || lower.includes('tablet')) return 'tablet';
  if (
    lower.includes('mobile') ||
    lower.includes('android') ||
    lower.includes('iphone')
  ) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Zero-filled daily view counts from `startDate` to `endDate` inclusive (IST).
 * Logs outside the window are ignored. Returns `[]` when the window is empty.
 */
export function buildTimeline(
  logs: { viewedAt: Date }[],
  startDate: Date,
  endDate: Date,
): TimelinePoint[] {
  if (startDate > endDate) return [];

  const timeline: Record<string, number> = {};
  const cursor = new Date(startDate);
  // Guard against unbounded loops if a bad range slips through.
  for (let i = 0; i <= 366 * 20; i++) {
    timeline[dayKey(cursor)] = 0;
    if (dayKey(cursor) === dayKey(endDate)) break;
    cursor.setDate(cursor.getDate() + 1);
  }

  logs.forEach((log) => {
    const key = dayKey(log.viewedAt);
    if (key in timeline) timeline[key]++;
  });

  return Object.entries(timeline).map(([date, count]) => ({ date, count }));
}
