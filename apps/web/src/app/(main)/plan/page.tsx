'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSkill } from '@/lib/useSkill';
import { loadResult } from '@/lib/db';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { saveUserProfile } from '@/lib/memory';
import { Card, Pill, LoadingState, ErrorState, EmptyState } from '@/components/skill-ui';
import { MemoryPanel } from '@/components/MemoryPanel';
import type { DiagnoseOutput } from '@ai-career-companion/types';

const DEFAULT_DIAGNOSE: DiagnoseOutput = {
  radar: [
    { name: '技术栈', current: 40, target: 80, gap: 40 },
    { name: '实习经历', current: 20, target: 70, gap: 50 },
    { name: '项目经历', current: 30, target: 75, gap: 45 },
    { name: '算法能力', current: 35, target: 70, gap: 35 },
    { name: '信息差', current: 25, target: 65, gap: 40 },
  ],
  recommendedRoles: [],
};

export default function PlanPage() {
  const { data, loading, error, run } = useSkill('plan');
  const [diagnose, setDiagnose] = useState<DiagnoseOutput | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-plan-shown')) {
        setShowBadge(true);
        localStorage.setItem('badge-plan-shown', 'true');
      }
      localStorage.setItem('hasPlanned', 'true');
      const gaps = diagnose?.radar?.filter((r) => r.gap > 20).map((r) => r.name) || [];
      const summary =
        gaps.length > 0 ? `已规划路径，重点提升：${gaps.join('、')}` : '已规划成长路径';
      saveUserProfile(summary);
    }
  }, [data]);

  useEffect(() => {
    loadResult('diagnose')
      .then((d) => setDiagnose((d as DiagnoseOutput) ?? null))
      .catch(() => {});
  }, []);

  const start = () => run(diagnose ?? DEFAULT_DIAGNOSE);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">路径规划</h1>
      <p className="mt-2 text-ink/60">基于你的诊断差距，生成 30 / 60 / 90 天可执行成长路径</p>
      <MemoryPanel skill="plan" />

      {showBadge && data && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="h-5 w-5 shrink-0" />
          路径规划达成！成长蓝图已就绪
        </div>
      )}

      <Card className="mt-6">
        <p className="text-sm text-ink/60">
          {diagnose
            ? '已读取你的破局诊断结果，将据此生成路径。'
            : '未找到诊断结果，将使用示例差距生成默认路径。'}
        </p>
        <button
          onClick={start}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '生成中…' : '生成成长路径'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="点击上方按钮，生成你的阶段化成长路径" />}
      {loading && !data && <LoadingState label="正在规划路径…" />}

      {data && (
        <div className="mt-6 space-y-4">
          {data.milestones?.map((m, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-ink">{m.title}</h3>
                <Pill tone="gold">{m.dayRange} 天</Pill>
              </div>
              <ul className="mt-3 space-y-2">
                {m.actions?.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-2xl bg-paper p-3">
                    <Pill
                      tone={
                        a.type === 'project' ? 'accent' : a.type === 'apply' ? 'forest' : 'gold'
                      }
                    >
                      {a.type}
                    </Pill>
                    <div>
                      <div className="font-medium text-ink">{a.title}</div>
                      <div className="text-sm text-ink/60">{a.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            开始实战练兵 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </main>
  );
}
