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
} from 'lucide-react';
import { loadProfile } from '@/lib/profile';
import jobsData from '@/lib/jobs-data.json';
import type { SkillName } from '@ai-career-companion/types';

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
  { skill: 'jobs', label: '岗位机会', desc: '三栏式岗位统览', icon: Building2 },
];

const HOT_JOBS = (
  jobsData.jobs as {
    id: string;
    company: string;
    role: string;
    salary: string;
    location: string;
    firstDegreeFriendly: boolean;
  }[]
).slice(0, 4);

export default function HomePage() {
  const profile = loadProfile();
  const identity = [profile.grade, profile.major, profile.targetRole].filter(Boolean).join(' · ');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
            <h2 className="font-serif text-lg font-bold text-ink">热门双非友好岗位</h2>
            <p className="text-xs text-ink/50">来自信息中枢岗位库</p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="divide-y divide-ink/5">
          {HOT_JOBS.map((j) => (
            <li key={j.id}>
              <Link
                href={`/jobs`}
                className="flex items-center justify-between gap-2 py-3 transition hover:opacity-80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{j.role}</p>
                  <p className="truncate text-xs text-ink/45">
                    {j.company} · {j.location}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-accent">{j.salary}</span>
              </Link>
            </li>
          ))}
        </ul>
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
