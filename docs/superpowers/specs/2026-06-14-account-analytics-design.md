# Backend — Dashboard Redesign Endpoints (Design)

_Date: 2026-06-14 · Branch: `nihal/account-analytics-endpoint`_

Implements the three items from the "Backend Handoff — Dashboard Redesign" note:
account-wide analytics aggregate, resume rename, and per-card view counts.

No database migration is required — `Resume.title` and the `ViewLog` event table already
exist.

## 0. Shared refactor — `analytics.util.ts`

The account endpoint must derive the same fields as the per-resume one (referrer/device/
browser classification, IST day-bucketing). Those currently live as private methods +
inline loops in `resume.service.ts`. Extract them into pure, reusable functions in a new
`src/modules/analytics/analytics.util.ts`:

- `parseReferer(referer: string | null): string`
- `parseBrowser(ua: string | null): string`
- `classifyDevice(ua: string | null): 'mobile' | 'tablet' | 'desktop'`
- `rangeToStartDate(range: AnalyticsRange, now?: Date): Date | null` (`null` for `all`)
- `buildTimeline(logs, startDate, endDate): { date: string; count: number }[]` (IST buckets)
- `IST_DAY_FORMATTER` shared `Intl.DateTimeFormat`

`resume.service.getAnalytics` is refactored to call these. Behavior must remain identical —
verified by diffing the per-resume payload before/after.

A shared `AnalyticsRange = '7d' | '30d' | '90d' | 'all'` type and the response interfaces
live in `analytics.types.ts` so the FE/BE contract is explicit and future-proof.

## 1. `GET /analytics?range=7d|30d|90d|all`

New `AnalyticsModule` (controller + service) → route is `/api/analytics` (not under
`/resumes`). Global JWT guard + `@CurrentUser()`. `range` validated by
`AccountAnalyticsQueryDto` (`@IsIn(['7d','30d','90d','all']) @IsOptional`, default `30d`).

`AnalyticsService.getAccountAnalytics(userId, range)`:

1. `startDate = rangeToStartDate(range)`.
2. Fetch the user's resumes (`id, title, slug`) — scopes the query and seeds `byResume`.
3. One query: `viewLog.findMany({ where: { resume: { userId }, viewedAt: gte startDate? } })`.
4. Aggregate to:

```jsonc
{
  "summary":   { "totalViews": 0, "uniqueViews": 0, "totalDownloads": 0 },
  "timeline":  [{ "date": "2026-06-01", "count": 12 }],
  "referrers": [{ "source": "linkedin.com", "count": 8 }],
  "campaigns": [{ "label": "Google-Frontend", "count": 5 }],
  "byResume":  [{ "id": "..", "title": "..", "slug": "..", "totalViews": 0 }]
}
```

Decisions:
- `uniqueViews` = distinct IPs across all the user's view logs in range (a visitor counted
  once even across multiple resumes), not the sum of per-resume uniques.
- `campaigns` includes **only labeled (`?for=`) links** — this panel is tracked-link
  performance. The per-resume "Default / Generic Link" bucket is intentionally omitted.
- `timeline`: fixed ranges → N day buckets ending today; `all` → earliest-log-day…today
  (empty array if there are no logs).
- `byResume` sorted by `totalViews` desc; resumes with zero views still appear.

## 2. `PATCH /resumes/:id` — rename

`@Patch(':id')` on the existing `ResumeController`, body `UpdateResumeDto { title:
@IsString @MinLength(1) }`. `ResumeService.rename(id, userId, title)`: ownership check via
`findFirst({ id, userId })` → `NotFoundException` if missing → update `title` → return the
updated resume with variants/versions (same shape as `findById`).

## 3. `totalViews` on `GET /resumes`

In `findByUserId`, after fetching resumes, one `viewLog.groupBy({ by: ['resumeId'], where: {
resume: { userId }, action: 'VIEW' }, _count })` builds a `resumeId → count` map; attach
`totalViews` to each returned resume. One extra query total, not per-card.

## Verification (manual — no test harness in repo)

Run against the dev DB with a real Bearer token:
- `/api/analytics` for `7d`, `30d`, `90d`, `all` — shapes + range math + empty-data case.
- Per-resume `/api/resumes/:id/analytics` payload byte-identical after the refactor.
- `PATCH /api/resumes/:id` renames and rejects another user's id (404).
- `GET /api/resumes` includes correct `totalViews` per card.
