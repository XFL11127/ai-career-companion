'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Radar, Route, Target, Newspaper, Briefcase, type LucideIcon } from 'lucide-react';
import type { SkillName } from '@ai-career-companion/types';
import {
  DiagnosePanel,
  PlanPanel,
  PracticePanel,
  InfoPanel,
  PackagePanel,
} from '@/components/skill-panels';

const TABS: { key: SkillName; label: string; icon: LucideIcon }[] = [
  { key: 'diagnose', label: '诊断', icon: Radar },
  { key: 'plan', label: '路径', icon: Route },
  { key: 'practice', label: '练兵', icon: Target },
  { key: 'info', label: '信息差', icon: Newspaper },
  { key: 'package', label: '包装', icon: Briefcase },
];

const TITLES: Record<SkillName, { title: string; desc: string }> = {
  diagnose: { title: '破局诊断', desc: '五维差距扫描 · 能力雷达图' },
  plan: { title: '路径规划', desc: '基于诊断差距，生成 30 / 60 / 90 天可执行成长路径' },
  practice: { title: '实战练兵', desc: '模拟面试 / 算法刷题 / 项目实战，边练边纠偏' },
  info: { title: '信息差填平', desc: '聚合双非友好的校招 / 实习 / 竞赛信息' },
  package: { title: '成果包装', desc: '简历优化 / 项目润色 / 面试复盘，把经历讲成故事' },
};

function AssistantContent() {
  const params = useSearchParams();
  const [tab, setTab] = useState<SkillName>('diagnose');

  useEffect(() => {
    const t = params.get('tab');
    if (t && TABS.some((x) => x.key === t)) setTab(t as SkillName);
  }, [params]);

  const meta = TITLES[tab];
  const ActiveIcon = TABS.find((t) => t.key === tab)?.icon ?? Radar;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-3">
        <ActiveIcon className="h-7 w-7 text-accent" />
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink">AI 学职助手</h1>
          <p className="mt-1 text-ink/60">
            {meta.title} · {meta.desc}
          </p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-ink/10 pb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-accent text-paper shadow-lg shadow-accent/20'
                  : 'border border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 当前 Panel */}
      <div className="mt-6">
        {tab === 'diagnose' && <DiagnosePanel onNext={setTab} />}
        {tab === 'plan' && <PlanPanel onNext={setTab} />}
        {tab === 'practice' && <PracticePanel onNext={setTab} />}
        {tab === 'info' && <InfoPanel onNext={setTab} />}
        {tab === 'package' && <PackagePanel />}
      </div>
    </main>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-6 py-12">
          <div className="text-ink/50">正在加载助手专区…</div>
        </main>
      }
    >
      <AssistantContent />
    </Suspense>
  );
}
