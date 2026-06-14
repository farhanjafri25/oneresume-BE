/**
 * Shared analytics contract — kept in one place so the per-resume and account-wide
 * endpoints (and the frontend that consumes them) stay in lockstep.
 */

export const ANALYTICS_RANGES = ['7d', '30d', '90d', 'all'] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface TimelinePoint {
  date: string; // YYYY-MM-DD in Asia/Kolkata
  count: number;
}

export interface ReferrerStat {
  source: string;
  count: number;
}

export interface CampaignStat {
  label: string;
  count: number;
}

export interface ResumeRollup {
  id: string;
  title: string;
  slug: string;
  totalViews: number;
}

export interface AccountAnalytics {
  summary: {
    totalViews: number;
    uniqueViews: number;
    totalDownloads: number;
  };
  timeline: TimelinePoint[];
  referrers: ReferrerStat[];
  campaigns: CampaignStat[];
  byResume: ResumeRollup[];
}
