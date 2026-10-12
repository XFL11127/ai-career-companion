import { NextResponse } from 'next/server';
import { getEvidenceFeed, getHubStats, getJobsFeed, getSources } from '@/lib/hub-store';

/** 信息中枢 · 证据库（只读）。标签由 deriveFriendlyLevel 计算，本接口不下发任何标签布尔值。 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const want = searchParams.get('include') ?? 'all';

  const [evidence, jobs, stats] = await Promise.all([
    getEvidenceFeed(),
    getJobsFeed(),
    getHubStats(),
  ]);

  return NextResponse.json({
    stats,
    sources: getSources(),
    evidence: want === 'jobs' ? [] : evidence.items,
    jobs: want === 'evidence' ? [] : jobs.items,
    meta: {
      evidenceSource: evidence.source,
      jobsSource: jobs.source,
      degraded: evidence.degraded || jobs.degraded,
      notice: evidence.error ?? jobs.error,
      generatedAt: new Date().toISOString(),
    },
  });
}
