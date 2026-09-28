/**
 * 信息中枢 · 证据链引擎
 *
 * 这一层负责把「一段检索结果」变成「一条可核对的证据」，并且保证：
 *   1. 证据必须带原文摘录（quote）——摘录不到原句，就不产出证据；
 *   2. 证据必须带可点击来源（sourceUrl）；
 *   3. 只有「白名单官方来源 + 强信号 + 正向」才能自动通过审核，其余进人工队列；
 *   4. 「双非友好」标签一律由 deriveFriendlyLevel() 计算，任何地方不得直接信任标签字段。
 */

import {
  deriveFriendlyLevel,
  hasRestrictionEvidence,
  type Credibility,
  type EvidenceItem,
  type EvidenceSignal,
  type FriendlyLevel,
} from '@ai-career-companion/types';
import { whitelistCredibility } from './whitelist';

export interface SignalRule {
  signal: EvidenceSignal;
  direction: 'positive' | 'negative';
  /** 强证据：单独就足以支撑「双非友好」结论 */
  strong: boolean;
  patterns: RegExp[];
}

/**
 * 信号识别规则表。
 * 说明：degree_barrier（如「本科及以上」）刻意标为 weak —— 它只说明门槛可及，
 * 不能推出「不限院校」，所以不能单独点亮「双非友好」。
 */
export const SIGNAL_RULES: readonly SignalRule[] = [
  {
    signal: 'policy',
    direction: 'positive',
    strong: true,
    patterns: [
      /(?:严禁|不得|禁止)[^。；！？!?\n]{0,40}(?:学历|院校|985|211|第一学历|性别|户籍)/g,
      /(?:不得设置|清理|取消)[^。；！？!?\n]{0,20}(?:歧视性|限制性)[^。；！？!?\n]{0,10}(?:条件|条款|规定)/g,
    ],
  },
  {
    signal: 'school_list',
    direction: 'positive',
    strong: true,
    patterns: [
      /不限(?:毕业)?院校|院校不限|不限定院校|无院校限制|不限学校|学校不限|面向全国高校|全国高校(?:应届)?均可/g,
    ],
  },
  {
    signal: 'bonus',
    direction: 'positive',
    strong: true,
    patterns: [
      /不限专业|专业不限|不限学历|学历不限|不卡学历|不设学历门槛|能力优先|经历优先|项目经历优先|作品[^。；！？!?\n]{0,8}优先|竞赛[^。；！？!?\n]{0,8}优先/g,
    ],
  },
  {
    signal: 'historical_admit',
    direction: 'positive',
    strong: true,
    patterns: [
      /(?:拟录用|录取|录用)[^。；！？!?\n]{0,8}(?:人员)?(?:名单|公示)|生源院校|录取院校分布/g,
    ],
  },
  {
    signal: 'degree_barrier',
    direction: 'positive',
    strong: false,
    patterns: [/本科及以上|本科以上|全日制本科|统招本科|专科及以上|本科应届/],
  },
  {
    signal: 'deadline',
    direction: 'positive',
    strong: false,
    patterns: [/(?:报名|投递|申请)截止|截止(?:时间|日期)|截止至?\s*\d{4}/],
  },
  {
    signal: 'school_list',
    direction: 'negative',
    strong: false,
    patterns: [
      /(?:仅限|只招|限)[^。；！？!?\n]{0,12}(?:985|211|双一流)/g,
      /(?:985|211|双一流)[^。；！？!?\n]{0,6}(?:院校)?(?:优先|以上|起|限定)/g,
      /第一学历/g,
    ],
  },
  {
    signal: 'degree_barrier',
    direction: 'negative',
    strong: false,
    patterns: [/全日制(?:本科|硕士)[^。；！？!?\n]{0,10}(?:不含|除外)|不含专升本|不含民办/g],
  },
];

export interface DetectedSignal {
  signal: EvidenceSignal;
  direction: 'positive' | 'negative';
  strong: boolean;
  quote: string;
}

interface Span {
  start: number;
  end: number;
  value: string;
}

function sentenceSpans(text: string): Span[] {
  const spans: Span[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if ('。；！？!?;\n'.includes(text[i])) {
      const value = text.slice(start, i + 1).trim();
      if (value) spans.push({ start, end: i + 1, value });
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) spans.push({ start, end: text.length, value: tail });
  return spans;
}

/** 取命中位置所在的那一句作为原文摘录（最长 300 字） */
export function extractQuote(text: string, index: number): string {
  const spans = sentenceSpans(text);
  const hit = spans.find((s) => index >= s.start && index < s.end) ?? spans[0];
  if (!hit) return '';
  const normalized = hit.value.replace(/\s+/g, ' ').trim();
  return normalized.length > 300 ? `${normalized.slice(0, 300)}…` : normalized;
}

/** 从一段文本里识别所有信号（同一 signal+direction+quote 去重） */
export function detectSignals(text: string): DetectedSignal[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const found: DetectedSignal[] = [];
  const seen = new Set<string>();

  for (const rule of SIGNAL_RULES) {
    for (const pattern of rule.patterns) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(clean)) !== null) {
        if (m[0].length === 0) {
          re.lastIndex += 1;
          continue;
        }
        const quote = extractQuote(clean, m.index);
        if (quote.length < 8) continue;
        const key = `${rule.signal}|${rule.direction}|${quote}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({
          signal: rule.signal,
          direction: rule.direction,
          strong: rule.strong,
          quote,
        });
        break; // 同一规则在同一段文本里只取第一条命中，避免噪音
      }
    }
  }
  return found;
}

export interface BuildEvidenceInput {
  company: string;
  role: string;
  sourceUrl: string;
  sourceSite?: string;
  text: string;
  publishedAt?: string;
  idPrefix?: string;
  reviewer?: string;
  /** 注入时间，便于测试 */
  now?: string;
}

/**
 * 文本 → 证据条目。
 * 自动通过审核的条件：白名单「official」来源 + 强信号 + 正向。
 * 其余一律 status='pending'，进入人工审核队列 —— 宁可少一条，不可错一条。
 */
export function buildEvidence(input: BuildEvidenceInput): EvidenceItem[] {
  const url = input.sourceUrl?.trim() ?? '';
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return []; // 链接非法 → 不产出任何证据
  }

  const detected = detectSignals(input.text ?? '');
  if (detected.length === 0) return [];

  const credibility: Credibility = whitelistCredibility(url);
  const fetchedAt = input.now ?? new Date().toISOString();
  const prefix = input.idPrefix ?? `ev_${Date.now().toString(36)}`;

  return detected.map((d, i) => {
    // 官方来源 + 正向 + 非「时间窗口」→ 自动通过；标签强度另由 deriveFriendlyLevel 分级
    const autoApprove =
      credibility === 'A' && d.direction === 'positive' && d.signal !== 'deadline';
    return {
      id: `${prefix}_${i}`,
      company: input.company.trim(),
      role: input.role.trim(),
      signal: d.signal,
      direction: d.direction,
      quote: d.quote,
      sourceUrl: url,
      sourceSite: input.sourceSite?.trim() || host,
      publishedAt: input.publishedAt,
      fetchedAt,
      credibility,
      reviewer: autoApprove ? (input.reviewer ?? 'auto:whitelist') : undefined,
      status: autoApprove ? 'approved' : 'pending',
    } satisfies EvidenceItem;
  });
}

export interface SearchResultLike {
  title: string;
  url: string;
  snippet: string;
  siteName?: string;
  datePublished?: string;
  company?: string;
  role?: string;
}

/** 检索结果 → 证据（无原文摘录则返回空数组，绝不凭空造标签） */
export function evidenceFromSearchResult(
  result: SearchResultLike,
  idPrefix?: string
): EvidenceItem[] {
  const text = `${result.title} ${result.snippet}`;
  return buildEvidence({
    company: result.company?.trim() || result.siteName?.trim() || result.title.trim(),
    role: result.role?.trim() || '未标注岗位',
    sourceUrl: result.url,
    sourceSite: result.siteName,
    text,
    publishedAt: result.datePublished,
    idPrefix,
  });
}

export interface EvidenceSummary {
  total: number;
  approved: number;
  pending: number;
  verified: number;
  reachable: number;
  hasRestriction: boolean;
  level: FriendlyLevel;
}

export function summarizeEvidence(evidence: readonly EvidenceItem[] = []): EvidenceSummary {
  const approved = evidence.filter((e) => e.status === 'approved');
  return {
    total: evidence.length,
    approved: approved.length,
    pending: evidence.filter((e) => e.status === 'pending').length,
    verified: approved.filter((e) => e.direction !== 'negative').length,
    reachable: approved.filter((e) => e.signal === 'degree_barrier' && e.direction !== 'negative')
      .length,
    hasRestriction: hasRestrictionEvidence(evidence),
    level: deriveFriendlyLevel(evidence),
  };
}

/** 给岗位打上「计算出来的」标签，UI 只读这里的结果 */
export function withFriendlyLevel<T extends { evidence?: EvidenceItem[] }>(
  job: T
): T & { friendlyLevel: FriendlyLevel; hasRestriction: boolean; friendlyLabel: string } {
  const evidence = job.evidence ?? [];
  const level = deriveFriendlyLevel(evidence);
  const label =
    level === 'verified' ? '双非友好 · 有据' : level === 'reachable' ? '门槛可及' : '未见依据';
  return {
    ...job,
    friendlyLevel: level,
    hasRestriction: hasRestrictionEvidence(evidence),
    friendlyLabel: label,
  };
}
