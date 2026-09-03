'use client';

import { useMemo, useState } from 'react';
import { panelCls } from '@/components/skill-ui';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Banknote,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Search,
  Library,
  WifiOff,
} from 'lucide-react';
import jobsData from '@/lib/jobs-data.json';
import { loadProfile } from '@/lib/profile';
import { demoSearch, type SourceCardData } from '@/lib/infobase';
import { SourceCard } from '@/components/source-card';
import { ResourceLibrary } from '@/components/resource-library';
import { ContributionPanel } from '@/components/contribution-panel';

type Job = {
  id: string;
  company: string;
  role: string;
  salary: string;
  location: string;
  industry: string;
  degree: string;
  firstDegreeFriendly: boolean;
  tags: string[];
  url: string;
  description: string;
  requirements: string[];
  deadline: string;
};

const JOBS = jobsData.jobs as Job[];
const ALL = '全部';

function calcMatch(job: Job, targetRole: string, major: string): number {
  let score = 62;
  if (targetRole && job.role.includes(targetRole)) score += 28;
  else if (targetRole && job.industry.includes(targetRole)) score += 14;
  if (major && job.requirements.some((r) => r.includes(major))) score += 6;
  if (job.firstDegreeFriendly) score += 4;
  return Math.min(95, score);
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-medium text-ink/40">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              aria-pressed={active}
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                active
                  ? 'bg-accent text-paper'
                  : 'border border-ink/15 text-ink/60 hover:border-accent/40 hover:text-accent'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HOT_WORDS = [
  '2027 校招',
  '双非 友好',
  '实习 转正',
  '软件工程',
  '数据分析',
  '国企 校招',
  '秋招 时间',
  '内推 渠道',
];

/**
 * 联网检索：嵌入「岗位预览」右侧栏。
 * 搜索框下加热门搜索词段（点击即检索）；结果以来源卡片（标题+链接+摘要+来源+时间）呈现。
 * 本期不接真实 Key，用 demoSearch 返回示例卡片（见 项目说明.md 资源库调用技术线）。
 */
function WebSearchBox({
  defaultQuery,
  onGoContribute,
}: {
  defaultQuery: string;
  onGoContribute: () => void;
}) {
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<SourceCardData[]>(() => demoSearch(defaultQuery));

  function run(e: React.FormEvent) {
    e.preventDefault();
    setResults(demoSearch(query));
  }

  function runHot(word: string) {
    setQuery(word);
    setResults(demoSearch(word));
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-ink/[0.015] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink/70">
        <Search className="h-3.5 w-3.5 text-accent" />
        联网检索
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
          <WifiOff className="h-3 w-3" />
          待接入 Key
        </span>
      </div>
      <form onSubmit={run} className="flex gap-1.5">
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="检索学校 / 企业官网最新信息"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink/30"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-paper transition hover:bg-[#c94a23]"
        >
          检索
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1">
        {HOT_WORDS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => runHot(w)}
            className="rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-ink/50 transition hover:border-accent/40 hover:text-accent"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="mt-2.5 space-y-2">
        {results.map((r, i) => (
          <SourceCard
            key={i}
            title={r.title}
            url={r.url}
            summary={r.summary}
            sourceSite={r.sourceSite}
            datePublished={r.datePublished}
            demo
            onContribute={onGoContribute}
          />
        ))}
      </div>
    </div>
  );
}

/** 岗位浏览（原三栏式，保留为「信息中枢」第一个 Tab）。 */
function JobBrowser({ onGoContribute }: { onGoContribute: () => void }) {
  const [city, setCity] = useState(ALL);
  const [industry, setIndustry] = useState(ALL);
  const [degree, setDegree] = useState(ALL);
  const [onlyFriendly, setOnlyFriendly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(JOBS[0]?.id ?? null);

  const profile = useMemo(() => loadProfile(), []);
  const targetRole = profile?.targetRole ?? '';
  const major = profile?.major ?? '';

  const cities = useMemo(() => [ALL, ...Array.from(new Set(JOBS.map((j) => j.location)))], []);
  const industries = useMemo(() => [ALL, ...Array.from(new Set(JOBS.map((j) => j.industry)))], []);
  const degrees = useMemo(() => [ALL, ...Array.from(new Set(JOBS.map((j) => j.degree)))], []);

  const filtered = useMemo(() => {
    const kw = keyword.trim();
    return JOBS.filter((j) => {
      if (city !== ALL && j.location !== city) return false;
      if (industry !== ALL && j.industry !== industry) return false;
      if (degree !== ALL && j.degree !== degree) return false;
      if (onlyFriendly && !j.firstDegreeFriendly) return false;
      if (kw) {
        const hay = `${j.company}${j.role}${j.industry}${j.location}${j.tags.join('')}`;
        if (!hay.toLowerCase().includes(kw.toLowerCase())) return false;
      }
      return true;
    })
      .map((j) => ({ ...j, match: calcMatch(j, targetRole, major) }))
      .sort((a, b) => b.match - a.match);
  }, [city, industry, degree, onlyFriendly, keyword, targetRole, major]);

  const selected = filtered.find((j) => j.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)_360px]">
      <aside className={`${panelCls} p-4`}>
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          筛选
        </div>
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-medium text-ink/40">搜索</div>
          <div className="flex items-center gap-1.5 rounded-xl border border-ink/15 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-ink/40" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="公司 / 岗位 / 技能"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
            />
          </div>
        </div>
        <FilterGroup label="城市" options={cities} value={city} onChange={setCity} />
        <FilterGroup label="行业" options={industries} value={industry} onChange={setIndustry} />
        <FilterGroup label="类型" options={degrees} value={degree} onChange={setDegree} />
        <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/70">
          <input
            type="checkbox"
            checked={onlyFriendly}
            onChange={(e) => setOnlyFriendly(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#E0592E]"
          />
          只看双非友好
        </label>
        <button
          type="button"
          onClick={() => {
            setCity(ALL);
            setIndustry(ALL);
            setDegree(ALL);
            setOnlyFriendly(false);
            setKeyword('');
          }}
          className="mt-4 w-full rounded-full border border-ink/15 py-1.5 text-xs text-ink/60 transition hover:border-accent/40 hover:text-accent"
        >
          重置筛选
        </button>
      </aside>

      <section className={panelCls}>
        <div className="border-b border-ink/10 px-4 py-2.5 text-xs text-ink/40">共 {filtered.length} 个岗位</div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink/40">没有符合条件的岗位，试试放宽筛选条件。</div>
        ) : (
          <ul className="divide-y divide-ink/5">
            {filtered.map((j) => {
              const active = selected?.id === j.id;
              return (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(j.id)}
                    className={`w-full px-4 py-3 text-left transition ${
                      active ? 'bg-accent/[0.06]' : 'hover:bg-ink/[0.02]'
                    }`}
                    aria-current={active}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{j.role}</span>
                      <span className="shrink-0 text-sm font-semibold text-accent">{j.salary}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink/50">
                      <span className="truncate">{j.company}</span>
                      <span className="text-ink/25">|</span>
                      <span className="shrink-0">{j.location}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                        <Sparkles className="h-3 w-3" />
                        AI 匹配 {j.match}%
                      </span>
                      {j.firstDegreeFriendly && (
                        <span className="rounded bg-forest/10 px-1.5 py-0.5 text-[11px] font-medium text-forest">
                          双非友好
                        </span>
                      )}
                      <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[11px] text-ink/50">{j.degree}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className={`${panelCls} p-5`}>
        {!selected ? (
          <div className="py-16 text-center text-sm text-ink/40">从左侧选择一个岗位查看详情</div>
        ) : (
          <div>
            <WebSearchBox
              key={selected.id}
              defaultQuery={`${selected.company} ${selected.role}`}
              onGoContribute={onGoContribute}
            />
            <div className="mt-5 border-t border-ink/10 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-bold text-ink">{selected.role}</h2>
                  <p className="mt-0.5 text-sm text-ink/60">{selected.company}</p>
                </div>
                <span className="shrink-0 text-lg font-bold text-accent">{selected.salary}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-ink/55">
                <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5">
                  <MapPin className="h-3 w-3" />
                  {selected.location}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5">
                  <Building2 className="h-3 w-3" />
                  {selected.industry}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5">
                  <Banknote className="h-3 w-3" />
                  {selected.degree}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink/75">{selected.description}</p>
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-medium text-ink/40">岗位要求</div>
                <ul className="space-y-1">
                  {selected.requirements.map((r, i) => (
                    <li key={i} className="flex gap-2 rounded-lg bg-ink/[0.02] px-2.5 py-1.5 text-xs leading-relaxed text-ink/70">
                      <span className="text-accent">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.tags.map((t) => (
                  <span key={t} className="rounded-full border border-ink/10 px-2 py-0.5 text-[11px] text-ink/50">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink/40">截止：{selected.deadline}</p>
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper transition hover:bg-[#c94a23]"
              >
                前往投递
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

const TABS = [
  { key: 'jobs', label: '岗位浏览', icon: Building2 },
  { key: 'resources', label: '资源库', icon: Library },
  { key: 'contribute', label: '贡献', icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function InfoHubPage() {
  const [tab, setTab] = useState<TabKey>('jobs');
  // 提交贡献 / 审核后递增，强制相关面板重新从 localStorage 读取
  const [dataVersion, setDataVersion] = useState(0);
  const bump = () => setDataVersion((v) => v + 1);

  function goContribute() {
    setTab('contribute');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-5">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">信息中枢</h1>
        <p className="mt-1 text-sm text-ink/60">
          岗位浏览 · 资源库 · 用户贡献（双非垂直信息底座）
        </p>
        <p className="mt-1.5 text-xs text-ink/45">
          这里是你自己检索、浏览的信息底座；需要 AI 帮你筛选匹配机会，去{' '}
          <Link href="/assistant?tab=info" className="font-medium text-accent hover:underline">
            助手 → 信息差
          </Link>
          。
        </p>
      </header>

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

      {tab === 'jobs' && <JobBrowser onGoContribute={goContribute} />}
      {tab === 'resources' && <ResourceLibrary key={dataVersion} onGoContribute={goContribute} />}
      {tab === 'contribute' && <ContributionPanel key={dataVersion} onChanged={bump} />}
    </main>
  );
}
