/**
 * 信息中枢 · 服务端数据层（仅服务端使用）
 *
 * 读取顺序：Supabase → 内置冷启动种子（hub-seed.json）。
 * 写入（提交贡献 / 审核）只在 Supabase 可用时进行；不可用时返回 degraded，
 * 由前端退回到 localStorage 草稿模式，保证「免登即用」不变。
 *
 * 重要：本模块不做任何标签推断，标签一律由 packages/types 的 deriveFriendlyLevel() 计算。
 */

import {
  canTransitionContribution,
  contributionToEvidence,
  deriveFriendlyLevel,
  hasRestrictionEvidence,
  type Contribution,
  type ContributionKind,
  type ContributionStatus,
  type Credibility,
  type EvidenceItem,
  type EvidenceSignal,
  type HubJob,
} from '@ai-career-companion/types';
import { CONTRIBUTION_POINTS } from '@ai-career-companion/types';
import seed from './hub-seed.json';
import { getSupabaseAdminConfig, isMissingTable, supabaseRest } from './supabase-admin';

export interface HubSource {
  id: string;
  name: string;
  url: string;
  category: string;
  desc: string;
}

export interface FeedResult<T> {
  items: T[];
  source: 'supabase' | 'seed';
  degraded: boolean;
  error?: string;
}

const SEED_EVIDENCE = seed.evidence as unknown as EvidenceItem[];
const SEED_JOBS = seed.jobs as unknown as HubJob[];
const SEED_SOURCES = seed.sources as unknown as HubSource[];

/**
 * 基础设施故障（网络不可达 / 5xx / 表缺失）应与「用户输入错误」区分开：
 * 前者必须标记 degraded，让前端退回本机草稿，而不是把用户挡在 400 上。
 */
function isInfraFailure(result: { status: number }): boolean {
  return result.status === 0 || result.status >= 500;
}

function decode<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

// ---------- 证据 ----------

export async function getEvidenceFeed(): Promise<FeedResult<EvidenceItem>> {
  const { configured } = getSupabaseAdminConfig();
  if (!configured) {
    return {
      items: SEED_EVIDENCE,
      source: 'seed',
      degraded: true,
      error: 'Supabase 未配置，当前使用内置冷启动证据集',
    };
  }

  const res = await supabaseRest<EvidenceItem[]>(
    'evidence_items?select=*&order=fetched_at.desc&limit=500'
  );
  if (res.ok) {
    const items = decode<EvidenceItem>(res.data, []);
    if (items.length === 0) {
      return {
        items: SEED_EVIDENCE,
        source: 'seed',
        degraded: true,
        error: '证据表为空，已回退内置冷启动证据集',
      };
    }
    return { items, source: 'supabase', degraded: false };
  }

  if (isMissingTable(res)) {
    return {
      items: SEED_EVIDENCE,
      source: 'seed',
      degraded: true,
      error: 'evidence_items 表不存在，请执行 supabase/migrations/007_evidence_hub.sql',
    };
  }
  return { items: SEED_EVIDENCE, source: 'seed', degraded: true, error: res.error };
}

// ---------- 岗位 ----------

export async function getJobsFeed(): Promise<FeedResult<HubJob>> {
  const { configured } = getSupabaseAdminConfig();
  if (!configured) {
    return {
      items: SEED_JOBS,
      source: 'seed',
      degraded: true,
      error: 'Supabase 未配置，当前只展示内置岗位',
    };
  }

  const res = await supabaseRest<HubJob[]>('hub_jobs?select=*&order=created_at.desc&limit=500');
  if (res.ok) {
    return { items: decode<HubJob>(res.data, []), source: 'supabase', degraded: false };
  }
  if (isMissingTable(res)) {
    return {
      items: SEED_JOBS,
      source: 'seed',
      degraded: true,
      error: 'hub_jobs 表不存在，请执行 007 迁移',
    };
  }
  return { items: SEED_JOBS, source: 'seed', degraded: true, error: res.error };
}

// ---------- 来源导航 ----------

export function getSources(): HubSource[] {
  return SEED_SOURCES;
}

// ---------- 贡献 ----------

interface ContributionRow {
  id: string;
  kind: ContributionKind;
  title: string;
  summary: string;
  url: string;
  company: string | null;
  role: string | null;
  signal: EvidenceSignal | null;
  quote: string | null;
  contact: string | null;
  status: ContributionStatus;
  credibility: Credibility | null;
  reviewer: string | null;
  review_note: string | null;
  points: number;
  owner_id: string | null;
  owner_role: string | null;
  created_at: string;
  updated_at: string;
}

function toContribution(row: ContributionRow): Contribution {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary ?? '',
    url: row.url,
    company: row.company ?? undefined,
    role: row.role ?? undefined,
    signal: row.signal ?? undefined,
    quote: row.quote ?? undefined,
    contact: row.contact ?? undefined,
    status: row.status,
    credibility: row.credibility ?? undefined,
    reviewer: row.reviewer ?? undefined,
    reviewNote: row.review_note ?? undefined,
    points: row.points ?? 0,
    ownerId: row.owner_id ?? undefined,
    ownerRole: row.owner_role ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ContributionInput {
  kind: ContributionKind;
  title: string;
  summary: string;
  url: string;
  company?: string;
  role?: string;
  signal?: EvidenceSignal;
  quote?: string;
  contact?: string;
  ownerId?: string;
  ownerRole?: string;
}

export async function listContributions(ownerId?: string): Promise<FeedResult<Contribution>> {
  const { configured } = getSupabaseAdminConfig();
  if (!configured) {
    return {
      items: [],
      source: 'seed',
      degraded: true,
      error: 'Supabase 未配置，贡献保存在本机浏览器',
    };
  }
  const filter = ownerId ? `&owner_id=eq.${encodeURIComponent(ownerId)}` : '';
  const res = await supabaseRest<ContributionRow[]>(
    `hub_contributions?select=*&order=created_at.desc&limit=200${filter}`
  );
  if (!res.ok) {
    return { items: [], source: 'seed', degraded: true, error: res.error };
  }
  return { items: (res.data ?? []).map(toContribution), source: 'supabase', degraded: false };
}

export interface MutationResult<T> {
  ok: boolean;
  degraded: boolean;
  data?: T;
  error?: string;
}

export async function createContribution(
  input: ContributionInput
): Promise<MutationResult<Contribution>> {
  const { configured } = getSupabaseAdminConfig();
  if (!configured) {
    return { ok: false, degraded: true, error: 'Supabase 未配置，已退回本机保存' };
  }
  if (!/^https?:\/\//i.test(input.url)) {
    return { ok: false, degraded: false, error: '来源链接必须是 http(s) 地址' };
  }

  const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const body = {
    id,
    kind: input.kind,
    title: input.title.trim(),
    summary: input.summary.trim(),
    url: input.url.trim(),
    company: input.company?.trim() || null,
    role: input.role?.trim() || null,
    signal: input.signal ?? null,
    quote: input.quote?.trim() || null,
    contact: input.contact?.trim() || null,
    status: 'pending' as const,
    owner_id: input.ownerId ?? null,
    owner_role: input.ownerRole ?? null,
  };

  const res = await supabaseRest<ContributionRow[]>('hub_contributions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, degraded: isInfraFailure(res) || isMissingTable(res), error: res.error };
  }
  const row = (res.data ?? [])[0];
  return { ok: true, degraded: false, data: row ? toContribution(row) : undefined };
}

export interface ReviewInput {
  id: string;
  to: ContributionStatus;
  credibility?: Credibility;
  reviewer: string;
  reviewNote?: string;
  /** 审核通过时用于给贡献者记分 */
  ownerId?: string;
}

export async function reviewContribution(
  input: ReviewInput
): Promise<MutationResult<Contribution>> {
  const { configured } = getSupabaseAdminConfig();
  if (!configured) {
    return { ok: false, degraded: true, error: 'Supabase 未配置，审核在本机进行' };
  }

  const current = await supabaseRest<ContributionRow[]>(
    `hub_contributions?id=eq.${encodeURIComponent(input.id)}&select=*`
  );
  if (!current.ok) {
    return {
      ok: false,
      degraded: isInfraFailure(current) || isMissingTable(current),
      error: current.error,
    };
  }
  const row = (current.data ?? [])[0];
  if (!row) return { ok: false, degraded: false, error: '贡献不存在' };

  if (!canTransitionContribution(row.status, input.to)) {
    return { ok: false, degraded: false, error: `不允许的状态流转：${row.status} → ${input.to}` };
  }

  const quote = (row.quote ?? '').trim();
  if (input.to === 'approved' && quote.length < 8) {
    return {
      ok: false,
      degraded: false,
      error: '该贡献没有原文摘录，不能通过审核。请先驳回或标记为「待补充证据」。',
    };
  }

  const credibility = input.credibility ?? row.credibility ?? 'C';
  const points = input.to === 'approved' ? CONTRIBUTION_POINTS[credibility] : 0;

  const res = await supabaseRest<ContributionRow[]>(
    `hub_contributions?id=eq.${encodeURIComponent(input.id)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: input.to,
        credibility: input.to === 'approved' ? credibility : row.credibility,
        reviewer: input.reviewer,
        review_note: input.reviewNote ?? null,
        points,
      }),
    }
  );
  if (!res.ok) {
    return { ok: false, degraded: isInfraFailure(res) || isMissingTable(res), error: res.error };
  }

  const updated = (res.data ?? [])[0];
  const contribution = updated ? toContribution(updated) : undefined;

  // 积分流水：写失败不影响审核结果
  if (input.to === 'approved' && contribution) {
    await supabaseRest('hub_points_ledger', {
      method: 'POST',
      body: JSON.stringify({
        user_id: input.ownerId ?? row.owner_id ?? 'anon',
        contribution_id: input.id,
        points,
        credibility,
        reason: `贡献通过审核（${credibility} 级）`,
      }),
    });
  }

  return { ok: true, degraded: false, data: contribution };
}

// ---------- 统计 ----------

export interface HubStats {
  evidenceTotal: number;
  evidenceApproved: number;
  evidencePending: number;
  verifiedJobs: number;
  restrictedEvidence: number;
  verifiedSources: number;
  bySignal: Record<string, number>;
  byCredibility: Record<string, number>;
}

export async function getHubStats(): Promise<HubStats> {
  const feed = await getEvidenceFeed();
  const approved = feed.items.filter((e) => e.status === 'approved');
  const bySignal: Record<string, number> = {};
  const byCredibility: Record<string, number> = {};
  for (const e of approved) {
    bySignal[e.signal] = (bySignal[e.signal] ?? 0) + 1;
    byCredibility[e.credibility] = (byCredibility[e.credibility] ?? 0) + 1;
  }
  const jobs = await getJobsFeed();
  return {
    evidenceTotal: feed.items.length,
    evidenceApproved: approved.length,
    evidencePending: feed.items.filter((e) => e.status === 'pending').length,
    verifiedJobs: jobs.items.filter((j) => deriveFriendlyLevel(j.evidence ?? []) === 'verified')
      .length,
    restrictedEvidence: feed.items.filter((e) => hasRestrictionEvidence([e])).length,
    verifiedSources: SEED_SOURCES.length,
    bySignal,
    byCredibility,
  };
}

/** 已通过审核的贡献 → 证据条目（供证据库合并展示） */
export async function getContributionEvidence(): Promise<EvidenceItem[]> {
  const res = await listContributions();
  return res.items.map(contributionToEvidence).filter((e): e is EvidenceItem => Boolean(e));
}
