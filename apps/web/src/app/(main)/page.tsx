'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Radar,
  Route,
  Target,
  Newspaper,
  Briefcase,
  Building2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { loadProfile } from '@/lib/profile';
import type { EvidenceItem, SkillName } from '@ai-career-companion/types';

const SKILL_CARDS: {
  skill: SkillName | 'jobs';
  label: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { skill: 'diagnose', label: '破局诊断', desc: '五维差距扫描', icon: Radar },
  { skill: 'plan', label: '路径规划', desc: '30/60/90 天路径', icon: Route },
  { skill: 'practice', label: '实战练兵', desc: '面试与刷题', icon: Target },
  { skill: 'info', label: '信息差填平', desc: '双非友好机会', icon: Newspaper },
  { skill: 'package', label: '成果包装', desc: '简历与项目润色', icon: Briefcase },
  { skill: 'jobs', label: '信息中枢', desc: '可核对的机会与证据', icon: Building2 },
];

interface EvidencePreview {
  stats: { evidenceApproved: number; evidencePending: number; verifiedSources: number };
  evidence: EvidenceItem[];
}

export default function HomePage() {
  const profile = loadProfile();
  const identity = [profile.grade, profile.major, profile.targetRole].filter(Boolean).join(' · ');
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<EvidencePreview | null>(null);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    fetch('/api/hub/evidence?include=evidence', { cache: 'no-store' })
      .then((r) => r.json() as Promise<EvidencePreview>)
      .then((data) => {
        if (alive) setPreview(data);
      })
      .catch(() => {
        /* 首页不因证据库不可用而报错 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const top = (preview?.evidence ?? []).filter((e) => e.status === 'approved').slice(0, 2);

  return (
    <main className="mx-auto max-w-5xl">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">你的双非破局同伴</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          3 分钟看清能力差距，拿到一条能执行的成长路径
        </p>
        {mounted && identity && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-xs text-ink/50">
            <Sparkles className="h-3 w-3" />
            {identity}
          </p>
        )}
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKILL_CARDS.map((card) => {
          const Icon = card.icon;
          const href = card.skill === 'jobs' ? '/jobs' : `/assistant?tab=${card.skill}`;
          return (
            <Link
              key={card.skill}
              href={href}
              className="group card-lift flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-4 transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-ink">{card.label}</h3>
                  <ArrowRight className="h-4 w-4 text-ink/30 transition group-hover:text-accent" />
                </div>
                <p className="mt-0.5 text-xs text-ink/50">{card.desc}</p>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-paper p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink">已核实的证据</h2>
            <p className="text-xs text-ink/50">
              信息中枢只收录能点开核对原文的信息，不编岗位。
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            进入信息中枢 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {preview && (
          <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-ink/50">
            <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-forest">
              <ShieldCheck className="h-3 w-3" />
              已核实证据 {preview.stats.evidenceApproved} 条
            </span>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">
              待审核 {preview.stats.evidencePending} 条
            </span>
            <span className="rounded-full bg-ink/5 px-2 py-0.5">
              白名单来源 {preview.stats.verifiedSources} 个
            </span>
          </div>
        )}

        {top.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 p-4 text-xs text-ink/45">
            暂无已核实证据，去信息中枢看看来源导航与贡献入口。
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {top.map((e) => (
              <li key={e.id} className="py-3">
                <p className="text-sm font-medium text-ink">{e.role}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/60">{e.quote}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ink/40">
                  <span>{e.sourceSite}</span>
                  {e.publishedAt && <span>· {e.publishedAt}</span>}
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-medium text-accent hover:underline"
                  >
                    查看原文
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 text-center">
        <Link
          href="/assistant"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23]"
        >
          <Sparkles className="h-4 w-4" />
          开始对话
        </Link>
      </section>
    </main>
  );
}