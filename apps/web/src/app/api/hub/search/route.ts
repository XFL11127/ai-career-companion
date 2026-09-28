import { NextResponse } from 'next/server';
import { evidenceFromSearchResult } from '@/lib/evidence';
import { searchProviderStatus, searchWeb, type SearchOutcome } from '@/lib/search-provider';
import { whitelistSize } from '@/lib/whitelist';
import {
  clientAddress,
  consumeSearchQuota,
  peekSearchQuota,
  readSearchCache,
  recordCacheHit,
  recordProviderCall,
  searchUsage,
  userSearchMode,
  writeSearchCache,
} from '@/lib/hub-search-guard';

/**
 * 信息中枢 · 联网检索（BFF）
 *
 * ⚠️ 这是本项目**唯一**会消耗博查 API 余额的用户入口（每次检索 = 1 次调用 = 扣钱）。
 * 因此有三层护栏（见 lib/hub-search-guard.ts）：
 *   1. 结果缓存：相同检索词在 HUB_SEARCH_CACHE_HOURS 内命中缓存，**不产生新调用**；
 *   2. 每 IP 每日配额：默认 3 次真实调用（HUB_SEARCH_DAILY_LIMIT）；
 *   3. 总开关：HUB_USER_SEARCH=off 时对用户关闭检索，只保留已核实库（运营侧用采集脚本更新）。
 *
 * 行为约定：未配置 BOCHA_API_KEY 时返回 degraded + 空结果，绝不返回伪造结果。
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  return handle(request, q, searchParams.get('scope') !== 'strict');
}

export async function POST(request: Request) {
  let body: { q?: string; includeNonWhitelisted?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  return handle(request, body.q ?? '', Boolean(body.includeNonWhitelisted));
}

async function handle(request: Request, q: string, includeNonWhitelisted: boolean) {
  const query = q.trim();
  const mode = userSearchMode();
  const address = clientAddress(request);
  const status = searchProviderStatus();

  if (!query) {
    return NextResponse.json({
      ok: false,
      degraded: true,
      reason: 'empty_query',
      message: '检索词不能为空',
    });
  }

  const meta = (extra: Record<string, unknown>) => ({
    mode,
    provider: status.provider,
    quota: peekSearchQuota(address),
    usage: searchUsage(),
    ...extra,
  });

  // 护栏 3：总开关
  if (mode === 'off') {
    return NextResponse.json({
      ok: false,
      degraded: true,
      reason: 'user_search_disabled',
      message:
        '联网检索当前由运营侧统一采集（避免按次计费被刷量）。请直接浏览「证据库 / 岗位」，或用「贡献与审核」提交你发现的来源。',
      query,
      results: [],
      evidenceCount: 0,
      whitelistedCount: 0,
      whitelistSize: whitelistSize(),
      existingBudget: '已核实库不消耗任何 API 额度',
      ...meta({ cached: false }),
    });
  }

  // 护栏 1：缓存命中 → 不扣额度、不调用 API
  const cached = readSearchCache(query);
  if (cached) {
    recordCacheHit();
    return NextResponse.json({
      ...cached,
      cached: true,
      evidenceCount: 0,
      whitelistSize: whitelistSize(),
      ...meta({ cached: true }),
    });
  }

  // 护栏 2：每 IP 每日配额
  if (mode === 'limited') {
    const quota = consumeSearchQuota(address);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          ok: false,
          degraded: true,
          reason: 'quota_exceeded',
          message: `今天的联网检索额度已用完（每 IP 每天 ${quota.limit} 次，北京时间 ${new Date(
            quota.resetAt
          ).toLocaleString('zh-CN')} 重置）。已核实库不受影响，可继续浏览。`,
          query,
          results: [],
          evidenceCount: 0,
          whitelistedCount: 0,
          whitelistSize: whitelistSize(),
          ...meta({ cached: false }),
        },
        { status: 429 }
      );
    }
  }

  const outcome: SearchOutcome = await searchWeb(query, { includeNonWhitelisted, count: 10 });
  recordProviderCall();
  writeSearchCache(query, outcome);

  const enriched = outcome.results.map((r) => ({
    ...r,
    evidence: evidenceFromSearchResult(r),
  }));

  return NextResponse.json({
    ...outcome,
    results: enriched,
    evidenceCount: enriched.reduce((n, r) => n + r.evidence.length, 0),
    cached: false,
    whitelistSize: whitelistSize(),
    ...meta({ cached: false }),
  });
}
