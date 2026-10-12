'use client';

/**
 * 信息中枢（/jobs）
 *
 * 本页的立身之本：只展示能核对的证据，不编岗位、不造检索结果。
 * - 证据库：每条证据都有原文摘录 + 来源链接 + 抓取时间；
 * - 岗位：只收录真实岗位；「双非友好」标签由 deriveFriendlyLevel 计算，无证据就不显示；
 * - 来源导航：白名单官方站点直达；
 * - 贡献：投稿必须带原文摘录，经审核后才公开。
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpenCheck,
  Building2,
  ExternalLink,
  Library,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { panelCls } from '@/components/skill-ui';
import { EvidenceCard, FriendlyBadge } from '@/components/evidence-panel';
import { HubSearch } from '@/components/hub-search';
import { ContributionPanel } from '@/components/contribution-panel';
import { deriveFriendlyLevel, hasRestrictionEvidence, type EvidenceItem, type HubJob } from '@ai-career-companion/types';

interface HubSource {
  id: string;
  name: string;
  url: string;
  category: string;
  desc: string;
}

interface HubStats {
  evidenceTotal: number;
  evidenceApproved: number;
  evidencePending: number;
  verifiedJobs: number;
  restrictedEvidence: number;
  verifiedSources: number;
}

interface HubPayload {
  stats: HubStats;
  sources: HubSource[];
  evidence: EvidenceItem[];
  jobs: HubJob[];
  meta: {
    evidenceSource: string;
    jobsSource: string;
    degraded: boolean;
    notice?: string;
    generatedAt: string;
  };
}

const SIGNAL_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'policy', label: '政策依据' },
  { value: 'degree_barrier', label: '学历门槛' },
  { value: 'school_list', label: '院校要求' },
  { value: 'bonus', label: '加分项' },
  { value: 'historical_admit', label: '历史录取' },
];

const TABS = [
  { key: 'evidence', label: '证据库', icon: BookOpenCheck },
  { key: 'jobs', label: '岗位', icon: Building2 },
  { key: 'sources', label: '来源导航', icon: Library },
  { key: 'contribute', label: '贡献与审核', icon: Sparkles },
  { key: 'search', label: '联网检索', icon: Search },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-paper px-3 py-2.5">
      <div className="text-lg font-bold text-ink">{value}</div>
      <div className="text-[11px] text-ink/50">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-ink/35">{hint}</div>}
    </div>
  );
}

function EvidenceLibrary({ evidence, total }: { evidence: EvidenceItem[]; total: number }) {
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(
    () => (filter === 'all' ? evidence : evidence.filter((e) => e.signal === filter)),
    [evidence, filter]
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SIGNAL_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              filter === f.value
                ? 'bg-accent text-paper'
                : 'border border-ink/15 text-ink/60 hover:border-accent/40 hover:text-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-ink/40">
          {showAll ? filtered.length : Math.min(36, filtered.length)} / {filtered.length} 条
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={`${panelCls} p-8 text-center text-sm text-ink/40`}>
          该分类下还没有证据。可以到「贡献与审核」提交带原文摘录的来源。
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {(showAll ? filtered : filtered.slice(0, 36)).map((item) => (
              <EvidenceCard key={item.id} item={item} />
            ))}
          </div>
          {!showAll && filtered.length > 36 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full rounded-xl border border-ink/15 py-2 text-xs text-ink/60 transition hover:border-accent/40 hover:text-accent"
            >
              显示全部 {filtered.length} 条（共核实 {total} 条）
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** 取该岗位证据里最新的发布日期（用于排序与「最新」标记） */
function newestEvidenceDate(job: HubJob): string {
  const dates = (job.evidence ?? []).map((e) => e.publishedAt ?? '').filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : '';
}

function daysAgo(dateStr: string): number {
  if (!dateStr) return Number.POSITIVE_INFINITY;
  const d = new Date(dateStr.slice(0, 10));
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function JobLibrary({ jobs }: { jobs: HubJob[] }) {
  const [showAll, setShowAll] = useState(false);
  if (jobs.length === 0) {
    return (
      <section className={`${panelCls} p-6`}>
        <h2 className="text-base font-semibold text-ink">岗位库正在按「证据优先」重建</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          旧版岗位库是 24 条匿名占位数据（公司名写作「某电商独角兽」、链接指向搜索页），
          对用户和评委都没有价值，已整体下架。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          新版规则只有一条：
          <span className="font-medium text-ink">没有原文证据的岗位，不进岗位库。</span>
        </p>
        <div className="mt-4 grid gap-2 text-xs text-ink/60 sm:grid-cols-3">
          <div className="rounded-xl bg-ink/[0.03] p-3">
            <div className="font-medium text-ink">① 配好检索 Key</div>
            <p className="mt-1 leading-relaxed">
              配置 <code className="rounded bg-ink/5 px-1">BOCHA_API_KEY</code> 后，「联网检索」可在白名单域名内实时取证。
            </p>
          </div>
          <div className="rounded-xl bg-ink/[0.03] p-3">
            <div className="font-medium text-ink">② 批量采集</div>
            <p className="mt-1 leading-relaxed">
              运行 <code className="rounded bg-ink/5 px-1">node scripts/harvest-evidence.mjs</code>，自动摘录原文并入库。
            </p>
          </div>
          <div className="rounded-xl bg-ink/[0.03] p-3">
            <div className="font-medium text-ink">③ 人工补录</div>
            <p className="mt-1 leading-relaxed">
              在「贡献与审核」提交岗位公告链接 + 原文摘录，审核通过即入库。
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink/45">
          现阶段先做窄：目标是一个城市 × 一类岗位 × 100 条可核验记录，而不是铺六个赛道的泛泛内容。
        </p>
      </section>
    );
  }

  // 默认按最新发布排序：用户打开就能看到「实时最新」的岗位
  const sorted = [...jobs].sort((x, y) =>
    newestEvidenceDate(y).localeCompare(newestEvidenceDate(x))
  );
  const visible = showAll ? sorted : sorted.slice(0, 24);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink/45">
        共 {jobs.length} 条岗位/公告，按发布时间倒序 · 全部来自官方来源且带原文证据（默认展示前 24 条）
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((job) => {
        const evidence = job.evidence ?? [];
        const level = deriveFriendlyLevel(evidence);
        const restricted = hasRestrictionEvidence(evidence);
        return (
          <article key={job.id} className={`${panelCls} p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-ink">{job.role}</h3>
                <p className="mt-0.5 text-xs text-ink/55">
                  {job.company} · {job.location} · {job.industry}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent">{job.salary}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {daysAgo(newestEvidenceDate(job)) <= 7 && (
                <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                  最新
                </span>
              )}
              <FriendlyBadge level={level} />
              {restricted && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-600">
                  含限制性表述
                </span>
              )}
              {job.degree && (
                <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[11px] text-ink/50">
                  {job.degree}
                </span>
              )}
              {(job.tags ?? [])
                .filter((tag) => tag === '已过期' || tag === '公告较早')
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/50">
              <span>发布：{newestEvidenceDate(job).slice(0, 10) || '见原文'}</span>
              {job.location && job.location !== '见原文' && <span>· {job.location}</span>}
              {job.deadline && <span>· {job.deadline}</span>}
            </div>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink/70">{job.description}</p>
            <div className="mt-3 space-y-2">
              {evidence.map((e) => (
                <EvidenceCard key={e.id} item={e} />
              ))}
            </div>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-paper transition hover:bg-[#c94a23]"
            >
              打开官方页面
              <ExternalLink className="h-3 w-3" />
            </a>
          </article>
        );
        })}
      </div>
      {!showAll && jobs.length > 24 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full rounded-xl border border-ink/15 py-2 text-xs text-ink/60 transition hover:border-accent/40 hover:text-accent"
        >
          显示全部 {jobs.length} 条
        </button>
      )}
    </div>
  );
}

function SourceDirectory({ sources }: { sources: HubSource[] }) {
  const groups: { key: string; label: string }[] = [
    { key: 'gov', label: '政府与公共就业服务' },
    { key: 'company', label: '企业官方校招站' },
    { key: 'platform', label: '招聘平台与社区' },
  ];
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = sources.filter((s) => s.category === g.key);
        if (items.length === 0) return null;
        return (
          <section key={g.key} className={`${panelCls} p-4`}>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-accent" />
              {g.label}
              <span className="text-xs font-normal text-ink/40">（{items.length}）</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-ink/10 bg-ink/[0.02] p-3 transition hover:border-accent/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{s.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-ink/30 transition group-hover:text-accent" />
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink/55">{s.desc}</p>
                </a>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function InfoHubPage() {
  const [tab, setTab] = useState<TabKey>('evidence');
  const [payload, setPayload] = useState<HubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/hub/evidence', { cache: 'no-store' })
      .then((r) => r.json() as Promise<HubPayload>)
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setError('');
      })
      .catch(() => {
        if (alive) setError('证据库加载失败，请刷新重试。');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [version]);

  const stats = payload?.stats;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-5">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">信息中枢</h1>
        <p className="mt-1 text-sm text-ink/60">
          只收录可核对的证据：每条「双非友好」都能点开看到原文摘录与来源。
        </p>
        <p className="mt-1.5 text-xs text-ink/45">
          需要 AI 帮你把这些信息转成行动方案，去{' '}
          <Link href="/assistant?tab=info" className="font-medium text-accent hover:underline">
            助手 → 信息差
          </Link>
          。
        </p>
      </header>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard label="已核实证据" value={stats.evidenceApproved} hint="带原文摘录 + 来源链接" />
          <StatCard label="待审核" value={stats.evidencePending} hint="机器摘录，等待人工核对" />
          <StatCard label="白名单来源" value={stats.verifiedSources} hint="政府 / 企业官方 / 权威平台" />
          <StatCard
            label="有据岗位"
            value={stats.verifiedJobs}
            hint={stats.verifiedJobs === 0 ? '宁缺毋滥，暂未收录' : '证据充分'}
          />
        </div>
      )}

      {payload?.meta.degraded && payload.meta.notice && (
        <p className="mb-4 rounded-xl bg-gold/10 p-3 text-[11px] text-ink/60">
          数据源提示：{payload.meta.notice}
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-ink/10 pb-3">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                active ? 'bg-accent text-paper' : 'text-ink/60 hover:bg-ink/[0.04] hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {loading && !payload && (
        <p className="py-10 text-center text-sm text-ink/40">正在加载证据库…</p>
      )}

      {payload && (
        <>
          {tab === 'evidence' && (
            <EvidenceLibrary evidence={payload.evidence} total={stats?.evidenceApproved ?? 0} />
          )}
          {tab === 'jobs' && <JobLibrary jobs={payload.jobs} />}
          {tab === 'sources' && <SourceDirectory sources={payload.sources} />}
          {tab === 'contribute' && (
            <ContributionPanel key={version} onChanged={() => setVersion((v) => v + 1)} />
          )}
          {tab === 'search' && <HubSearch />}
        </>
      )}
    </main>
  );
}