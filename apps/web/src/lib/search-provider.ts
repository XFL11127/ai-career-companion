/**
 * 信息中枢 · 联网检索适配层
 *
 * 供应商优先级：
 *   1. 博查 AI Web Search（Bocha）—— 配了 BOCHA_API_KEY 时首选，质量最好；
 *   2. Bing RSS —— 免 Key 的次级通道，结果是真实网页（不是伪造数据），但召回与排序较差；
 *   3. 都没有 —— 返回 degraded + 空结果，绝不返回示例/伪造结果。
 *
 * 环境变量：
 *   BOCHA_API_KEY        博查 Key
 *   HUB_SEARCH_PROVIDER  强制指定 'bocha' | 'bing-rss'（用于对比与排障）
 *   HUB_SEARCH_ENDPOINT  覆盖博查端点
 */

import { findWhitelistEntry, whitelistCredibility } from './whitelist';

export type SearchProvider = 'bocha' | 'bing-rss' | 'none';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  datePublished?: string;
  /** 是否命中白名单；非白名单结果只能作为线索，不能作为证据 */
  whitelisted: boolean;
  credibility: 'A' | 'B' | 'C';
}

export type SearchReason = 'missing_api_key' | 'provider_error' | 'empty_query' | 'no_results';

export interface SearchOutcome {
  ok: boolean;
  provider: SearchProvider;
  degraded: boolean;
  reason?: SearchReason;
  message?: string;
  query: string;
  results: WebSearchResult[];
  whitelistedCount: number;
  searchedAt: string;
}

interface BochaItem {
  name?: string;
  url?: string;
  snippet?: string;
  summary?: string;
  siteName?: string;
  dateLastCrawled?: string;
  datePublished?: string;
}

function apiKey(): string {
  return process.env.BOCHA_API_KEY ?? process.env.HUB_SEARCH_API_KEY ?? '';
}

/** 解析实际会使用的供应商 */
export function resolveProvider(): SearchProvider {
  const forced = (process.env.HUB_SEARCH_PROVIDER ?? '').trim().toLowerCase();
  if (forced === 'bocha') return apiKey() ? 'bocha' : 'none';
  if (forced === 'bing-rss') return 'bing-rss';
  return apiKey() ? 'bocha' : 'bing-rss';
}

export function searchProviderStatus(): { configured: boolean; provider: SearchProvider } {
  const provider = resolveProvider();
  return { configured: provider !== 'none', provider };
}

/** RSS/搜索接口返回的日期不保证可解析 */
function safeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalize(
  url: string,
  title: string,
  snippet: string,
  siteName?: string,
  datePublished?: string
): WebSearchResult | null {
  if (!/^https?:\/\//i.test(url)) return null;
  const host = hostOf(url);
  if (!host) return null;
  return {
    title: (title || host).replace(/\s+/g, ' ').trim(),
    url,
    snippet: (snippet || '').replace(/\s+/g, ' ').trim(),
    siteName: siteName?.trim() || host,
    datePublished,
    whitelisted: Boolean(findWhitelistEntry(url)),
    credibility: whitelistCredibility(url),
  };
}

function filterResults(
  results: WebSearchResult[],
  includeNonWhitelisted: boolean
): WebSearchResult[] {
  return includeNonWhitelisted ? results : results.filter((r) => r.whitelisted);
}

function stripTags(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// ---------- 博查 ----------

function normalizeBocha(raw: BochaItem): WebSearchResult | null {
  return normalize(
    (raw.url ?? '').trim(),
    raw.name ?? raw.siteName ?? '',
    raw.summary || raw.snippet || '',
    raw.siteName,
    raw.datePublished ?? raw.dateLastCrawled
  );
}

async function searchBocha(query: string, options: SearchOptions): Promise<SearchOutcome> {
  const startedAt = new Date().toISOString();
  const key = apiKey();
  const endpoint = process.env.HUB_SEARCH_ENDPOINT ?? 'https://api.bochaai.com/v1/web-search';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        freshness: 'noLimit',
        summary: true,
        count: options.count ?? 10,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        ok: false,
        provider: 'bocha',
        degraded: true,
        reason: 'provider_error',
        message: `检索服务返回 ${res.status}`,
        query,
        results: [],
        whitelistedCount: 0,
        searchedAt: startedAt,
      };
    }

    const payload = (await res.json()) as {
      data?: { webPages?: { value?: BochaItem[] } };
      webPages?: { value?: BochaItem[] };
    };
    const items = payload.data?.webPages?.value ?? payload.webPages?.value ?? [];
    const results = filterResults(
      items.map(normalizeBocha).filter((r): r is WebSearchResult => Boolean(r)),
      Boolean(options.includeNonWhitelisted)
    );

    return {
      ok: true,
      provider: 'bocha',
      degraded: false,
      reason: results.length === 0 ? 'no_results' : undefined,
      message:
        results.length === 0
          ? '白名单内没有匹配结果。可到「贡献」提交来源，审核通过后入库。'
          : undefined,
      query,
      results,
      whitelistedCount: results.filter((r) => r.whitelisted).length,
      searchedAt: startedAt,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      provider: 'bocha',
      degraded: true,
      reason: 'provider_error',
      message: aborted ? '检索超时，请稍后重试' : '检索服务暂时不可用',
      query,
      results: [],
      whitelistedCount: 0,
      searchedAt: startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Bing RSS（免 Key 次级通道）----------

interface BingItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}

function parseBingRss(xml: string): BingItem[] {
  const items: BingItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const pick = (tag: string): string => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return m ? stripTags(m[1]).trim() : '';
    };
    const title = stripTags(pick('title'));
    const link = pick('link');
    if (!link) continue;
    items.push({
      title,
      link,
      description: pick('description'),
      pubDate: pick('pubDate') || undefined,
    });
  }
  return items;
}

async function searchBingRss(query: string, options: SearchOptions): Promise<SearchOutcome> {
  const startedAt = new Date().toISOString();
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss&count=${options.count ?? 20}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        ok: false,
        provider: 'bing-rss',
        degraded: true,
        reason: 'provider_error',
        message: `次级检索通道返回 ${res.status}`,
        query,
        results: [],
        whitelistedCount: 0,
        searchedAt: startedAt,
      };
    }

    const items = parseBingRss(await res.text());
    const results = filterResults(
      items
        .map((i) => normalize(i.link, i.title, i.description, undefined, safeDate(i.pubDate)))
        .filter((r): r is WebSearchResult => Boolean(r)),
      Boolean(options.includeNonWhitelisted)
    );

    return {
      ok: true,
      provider: 'bing-rss',
      // 免 Key 通道标记为降级：结果真实，但召回质量低于博查，需人工多核对一步
      degraded: true,
      reason: results.length === 0 ? 'no_results' : undefined,
      message:
        results.length === 0
          ? '白名单内没有匹配结果。可到「贡献」提交来源，审核通过后入库。'
          : '当前使用免 Key 次级检索通道（Bing RSS），结果真实但召回有限；配置 BOCHA_API_KEY 可显著提升覆盖。',
      query,
      results,
      whitelistedCount: results.filter((r) => r.whitelisted).length,
      searchedAt: startedAt,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      provider: 'bing-rss',
      degraded: true,
      reason: 'provider_error',
      message: aborted ? '检索超时，请稍后重试' : '次级检索通道暂时不可用',
      query,
      results: [],
      whitelistedCount: 0,
      searchedAt: startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface SearchOptions {
  count?: number;
  /** true = 保留非白名单结果（仅作线索展示，前端需标注「非白名单」） */
  includeNonWhitelisted?: boolean;
  timeoutMs?: number;
}

/**
 * 执行一次联网检索。任何失败都以 degraded 形式返回，不抛异常、不造数据。
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchOutcome> {
  const q = query.trim();
  const searchedAt = new Date().toISOString();
  const empty: SearchOutcome = {
    ok: false,
    provider: 'none',
    degraded: true,
    query: q,
    results: [],
    whitelistedCount: 0,
    searchedAt,
  };

  if (!q) {
    return { ...empty, reason: 'empty_query', message: '检索词不能为空' };
  }

  const provider = resolveProvider();
  if (provider === 'bocha') return searchBocha(q, options);
  if (provider === 'bing-rss') return searchBingRss(q, options);

  return {
    ...empty,
    reason: 'missing_api_key',
    message: '检索通道不可用，当前只展示已核实精选库，不返回未经验证的联网结果。',
  };
}
