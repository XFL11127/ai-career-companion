'use client';

/**
 * 信息中枢 · 联网检索组件
 *
 * 关键行为：不做「示例结果」兜底。未配置检索 Key 时明确展示降级原因，
 * 并引导用户使用已核实证据库 / 提交贡献，而不是给一堆看起来像真的假结果。
 */

import { useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, Search, ShieldCheck, WifiOff } from 'lucide-react';
import { panelCls } from '@/components/skill-ui';
import { EvidenceCard } from '@/components/evidence-panel';
import type { EvidenceItem } from '@ai-career-companion/types';

interface HubSearchResult {
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  datePublished?: string;
  whitelisted: boolean;
  credibility: 'A' | 'B' | 'C';
  evidence: EvidenceItem[];
}

interface HubSearchOutcome {
  ok: boolean;
  provider: 'bocha' | 'bing-rss' | 'none';
  degraded: boolean;
  reason?: string;
  message?: string;
  query: string;
  results: HubSearchResult[];
  evidenceCount: number;
  whitelistedCount: number;
  searchedAt: string;
  providerStatus: { configured: boolean; provider: string };
  whitelistSize: number;
  cached?: boolean;
  mode?: 'off' | 'limited' | 'unlimited';
  quota?: { allowed: boolean; remaining: number; limit: number; resetAt: number };
  usage?: { providerCalls: number; cacheHits: number; cachedQueries: number };
}

const HOT_WORDS = ['2027 校招 本科及以上', '不限院校 校招', '双非 秋招 公告', '国企 校招 不限专业'];

export function HubSearch({ defaultQuery = '' }: { defaultQuery?: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<HubSearchOutcome | null>(null);
  const [error, setError] = useState('');

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hub/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const data = (await res.json()) as HubSearchOutcome;
      setOutcome(data);
    } catch {
      setError('检索请求失败，请检查网络后重试。');
      setOutcome(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`${panelCls} p-4`}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink/70">
        <Search className="h-3.5 w-3.5 text-accent" />
        联网检索（白名单来源）
        <span className="ml-auto flex items-center gap-2 text-[10px] font-normal text-ink/40">
          <span>白名单 {outcome?.whitelistSize ?? '—'} 个域名</span>
          {outcome?.quota && (
            <span
              className={
                outcome.quota.remaining > 0
                  ? 'rounded bg-forest/10 px-1.5 py-0.5 text-forest'
                  : 'rounded bg-red-100 px-1.5 py-0.5 text-red-600'
              }
            >
              今日检索剩余 {outcome.quota.remaining}/{outcome.quota.limit}
            </span>
          )}
          {outcome?.cached && (
            <span className="rounded bg-ink/5 px-1.5 py-0.5">命中缓存 · 未消耗额度</span>
          )}
        </span>
      </div>

      <form onSubmit={run} className="flex gap-1.5">
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：不限院校 校招 本科及以上"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-paper transition hover:bg-[#c94a23] disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          检索
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-1">
        {HOT_WORDS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setQuery(w)}
            className="rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-ink/50 transition hover:border-accent/40 hover:text-accent"
          >
            {w}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-[11px] text-red-600">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {outcome && !outcome.ok && (
        <div className="mt-3 rounded-lg bg-gold/10 p-3 text-[11px] leading-relaxed text-ink/70">
          <p className="flex items-center gap-1.5 font-medium text-gold">
            <WifiOff className="h-3.5 w-3.5" />
            {outcome.reason === 'missing_api_key'
              ? '联网检索未启用'
              : outcome.reason === 'quota_exceeded'
                ? '今日额度已用完'
                : outcome.reason === 'user_search_disabled'
                  ? '联网检索由运营侧统一采集'
                  : '本次检索未成功'}
          </p>
          <p className="mt-1">{outcome.message}</p>
          {(outcome.reason === 'quota_exceeded' || outcome.reason === 'user_search_disabled') && (
            <p className="mt-1 text-ink/50">
              联网检索按次计费，为防止额度被刷空，对用户做了限额；<strong>已核实的证据库与岗位库不消耗任何额度</strong>，可继续浏览。
            </p>
          )}
          {outcome.reason === 'missing_api_key' && (
            <p className="mt-1 text-ink/50">
              配置 <code className="rounded bg-ink/5 px-1">BOCHA_API_KEY</code> 后即可检索；在此之前，产品只展示
              已核实证据库与官方来源导航，不提供任何示例结果。
            </p>
          )}
        </div>
      )}

      {outcome?.ok && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-ink/45">
            命中 {outcome.results.length} 条（白名单内 {outcome.whitelistedCount} 条）· 提取证据{' '}
            {outcome.evidenceCount} 条 · {outcome.searchedAt.slice(0, 19).replace('T', ' ')}
            {outcome.cached ? ' · 来自缓存' : ''}
          </p>
          {outcome.results.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink/15 p-3 text-[11px] text-ink/45">
              {outcome.message ?? '白名单内没有匹配结果。'}
            </p>
          )}
          {outcome.results.map((r) => (
            <article key={r.url} className="rounded-xl border border-ink/10 bg-ink/[0.02] p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-semibold leading-snug text-ink">{r.title}</h3>
                {r.whitelisted ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-forest/10 px-1.5 py-0.5 text-[10px] text-forest">
                    <ShieldCheck className="h-3 w-3" />
                    白名单 {r.credibility} 级
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] text-ink/45">
                    非白名单 · 仅线索
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink/60">{r.snippet}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink/40">
                <span>{r.siteName}</span>
                {r.datePublished && <span>· {r.datePublished}</span>}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-0.5 text-accent hover:underline"
                >
                  打开原文
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              {r.evidence.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {r.evidence.map((e) => (
                    <EvidenceCard key={e.id} item={e} />
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}