/**
 * 信息中枢 · 检索域名白名单
 *
 * 只有白名单来源才有资格进入证据链；其余结果一律标记为非白名单，不得用于点亮「双非友好」。
 *
 * 两类规则：
 *   1. entries  —— 逐个列出的域名（企业官方校招站、招聘平台、部分高校就业网），带实测可达性；
 *   2. patterns —— 按域名空间匹配的规则（见下），用于覆盖数量庞大的高校/政府站点。
 *
 * 为什么可以用 patterns：
 *   - `gov.cn` 仅政府机关可注册，全域名视为官方来源（A 级）；
 *   - `edu.cn` 仅教育机构可注册，其中 job./career./jyb./jy. 等前缀是学校就业服务子站（A 级）。
 *   二者都属于「注册即有资质审核」的受限域名空间，因此不需要逐个人工核验。
 *
 * 数据文件：whitelist.json（与采集脚本 scripts/harvest-evidence.mjs 共用同一份）。
 * 复核命令：npm run hub:verify-whitelist
 */

import whitelistData from './whitelist.json';

export type WhitelistTier = 'official' | 'authoritative';
export type WhitelistCategory = 'gov' | 'company' | 'university' | 'platform' | 'other';

export interface WhitelistEntry {
  domain: string;
  name: string;
  tier: WhitelistTier;
  category: WhitelistCategory;
  reachability: 'verified' | 'unverified';
}

export interface WhitelistPattern {
  suffix: string;
  /** null = 整个域名空间都算；否则要求主机名第一段命中这些前缀之一 */
  labels: string[] | null;
  tier: WhitelistTier;
  category: WhitelistCategory;
  name: string;
  note?: string;
}

export interface WhitelistMatch {
  domain: string;
  name: string;
  tier: WhitelistTier;
  category: WhitelistCategory;
  source: 'explicit' | 'pattern';
  reachability?: 'verified' | 'unverified';
}

interface WhitelistData {
  entries: WhitelistEntry[];
  patterns: WhitelistPattern[];
}

const data = whitelistData as unknown as WhitelistData;

export const WHITELIST: readonly WhitelistEntry[] = data.entries;
export const WHITELIST_PATTERNS: readonly WhitelistPattern[] = data.patterns;

/** 允许通过环境变量追加域名（运营/高校合作时按需扩展，无需改代码） */
export function extraWhitelistDomains(): string[] {
  const raw = process.env.HUB_WHITELIST_EXTRA ?? '';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function matches(host: string, domain: string): boolean {
  const d = domain.toLowerCase().replace(/^www\./, '');
  return host === d || host.endsWith(`.${d}`);
}

function matchPattern(host: string): WhitelistMatch | undefined {
  for (const pattern of WHITELIST_PATTERNS) {
    if (!matches(host, pattern.suffix)) continue;
    if (pattern.labels) {
      const firstLabel = host.split('.')[0];
      if (!pattern.labels.includes(firstLabel)) continue;
    }
    return {
      domain: host,
      name: pattern.name,
      tier: pattern.tier,
      category: pattern.category,
      source: 'pattern',
    };
  }
  return undefined;
}

/**
 * 取最具体的匹配项：先看显式名单（子域优先），再落到域名空间规则。
 * 例：job.hdu.edu.cn 命中显式 entry；job.xyz.edu.cn 命中 edu.cn 就业子域规则。
 */
export function findWhitelistMatch(url: string): WhitelistMatch | undefined {
  const host = normalizeHostname(url);
  if (!host) return undefined;

  const explicit = WHITELIST.filter((e) => matches(host, e.domain)).sort(
    (a, b) => b.domain.length - a.domain.length
  )[0];
  if (explicit) {
    return {
      domain: explicit.domain,
      name: explicit.name,
      tier: explicit.tier,
      category: explicit.category,
      source: 'explicit',
      reachability: explicit.reachability,
    };
  }

  for (const extra of extraWhitelistDomains()) {
    if (matches(host, extra)) {
      return {
        domain: extra,
        name: '自定义白名单域名',
        tier: 'official',
        category: 'other',
        source: 'explicit',
      };
    }
  }

  return matchPattern(host);
}

export function findWhitelistEntry(url: string): WhitelistEntry | undefined {
  const host = normalizeHostname(url);
  return WHITELIST.filter((e) => matches(host, e.domain)).sort(
    (a, b) => b.domain.length - a.domain.length
  )[0];
}

export function isWhitelisted(url: string): boolean {
  return Boolean(findWhitelistMatch(url));
}

/** 白名单层级 → 证据可信度：官方 = A，权威平台 = B，非白名单 = C */
export function whitelistCredibility(url: string): 'A' | 'B' | 'C' {
  const match = findWhitelistMatch(url);
  if (!match) return 'C';
  return match.tier === 'official' ? 'A' : 'B';
}

export function whitelistDomains(): string[] {
  return [...WHITELIST.map((e) => e.domain), ...extraWhitelistDomains()];
}

export function whitelistSize(): number {
  return whitelistDomains().length;
}

/** 供 UI 展示：显式域名数 + 规则可覆盖的域名空间数 */
export function whitelistCoverage(): { explicit: number; patterns: number } {
  return {
    explicit: WHITELIST.length + extraWhitelistDomains().length,
    patterns: WHITELIST_PATTERNS.length,
  };
}
