/**
 * 信息中枢 · 用户检索的「花钱护栏」
 *
 * 背景：`/api/hub/search` 是**唯一**会消耗博查余额的用户入口，每次检索 = 1 次 API 调用 = 扣钱。
 * 因此这一层要保证三件事：
 *   1. 相同检索词在缓存期内不重复扣费（命中缓存 → 0 次调用）；
 *   2. 每个来源 IP 每天有调用上限，防止被刷爆；
 *   3. 可以通过环境变量把用户检索整体关掉，只保留「已核实库」（运营侧用采集脚本更新）。
 *
 * 环境变量：
 *   HUB_USER_SEARCH=off|limited|unlimited   （默认 limited）
 *   HUB_SEARCH_DAILY_LIMIT=3                （每个 IP 每天允许的真实 API 调用次数）
 *   HUB_SEARCH_CACHE_HOURS=24               （相同检索词的结果缓存时长）
 *
 * ⚠️ 当前为**进程内存**实现：Vercel 多实例部署时限额是「每实例近似值」，不是全局精确值。
 * 生产化应替换为 Upstash Redis / Cloudflare KV，保持这里的函数签名不变。
 */

import type { SearchOutcome } from './search-provider';

export type UserSearchMode = 'off' | 'limited' | 'unlimited';

export function userSearchMode(): UserSearchMode {
  const raw = (process.env.HUB_USER_SEARCH ?? 'limited').trim().toLowerCase();
  if (raw === 'off' || raw === 'unlimited') return raw;
  return 'limited';
}

function dailyLimit(): number {
  const n = Number(process.env.HUB_SEARCH_DAILY_LIMIT ?? 3);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

function cacheTtlMs(): number {
  const h = Number(process.env.HUB_SEARCH_CACHE_HOURS ?? 24);
  return (Number.isFinite(h) && h > 0 ? h : 24) * 60 * 60 * 1000;
}

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// ---------- 结果缓存（相同检索词不重复扣费）----------

interface CacheEntry {
  at: number;
  outcome: SearchOutcome;
}

const cache = new Map<string, CacheEntry>();
const CACHE_MAX = 500;

function cacheKey(query: string): string {
  return query.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function readSearchCache(query: string): SearchOutcome | null {
  const entry = cache.get(cacheKey(query));
  if (!entry) return null;
  if (Date.now() - entry.at > cacheTtlMs()) {
    cache.delete(cacheKey(query));
    return null;
  }
  return entry.outcome;
}

export function writeSearchCache(query: string, outcome: SearchOutcome): void {
  cache.set(cacheKey(query), { at: Date.now(), outcome });
  if (cache.size > CACHE_MAX) {
    // 淘汰最早写入的一条
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

// ---------- 每 IP 每日配额 ----------

interface Quota {
  count: number;
  resetAt: number;
}

const quotas = new Map<string, Quota>();
const DAY_MS = 24 * 60 * 60 * 1000;

export interface QuotaResult {
  allowed: boolean;
  /** 今天还剩几次「真实 API 调用」额度 */
  remaining: number;
  limit: number;
  resetAt: number;
}

export function consumeSearchQuota(address: string): QuotaResult {
  const limit = dailyLimit();
  const now = Date.now();
  const existing = quotas.get(address);
  const quota: Quota =
    !existing || existing.resetAt <= now ? { count: 0, resetAt: now + DAY_MS } : existing;

  if (quota.count >= limit) {
    quotas.set(address, quota);
    return { allowed: false, remaining: 0, limit, resetAt: quota.resetAt };
  }

  quota.count += 1;
  quotas.set(address, quota);

  if (quotas.size > 10_000) {
    for (const [k, v] of quotas) {
      if (v.resetAt <= now) quotas.delete(k);
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - quota.count),
    limit,
    resetAt: quota.resetAt,
  };
}

export function peekSearchQuota(address: string): QuotaResult {
  const limit = dailyLimit();
  const now = Date.now();
  const existing = quotas.get(address);
  if (!existing || existing.resetAt <= now) {
    return { allowed: true, remaining: limit, limit, resetAt: now + DAY_MS };
  }
  return {
    allowed: existing.count < limit,
    remaining: Math.max(0, limit - existing.count),
    limit,
    resetAt: existing.resetAt,
  };
}

// ---------- 调用计量（便于你自己审计花了多少次）----------

let providerCalls = 0;
let cacheHits = 0;

export function recordProviderCall(): void {
  providerCalls += 1;
}

export function recordCacheHit(): void {
  cacheHits += 1;
}

export function searchUsage(): { providerCalls: number; cacheHits: number; cachedQueries: number } {
  return { providerCalls, cacheHits, cachedQueries: cache.size };
}
