'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSkill } from '@/lib/useSkill';
import { ArrowRight, PartyPopper } from 'lucide-react';
import { saveUserProfile } from '@/lib/memory';
import {
  RadarChart,
  Card,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/skill-ui';
import { MemoryPanel } from '@/components/MemoryPanel';

export default function DiagnosePage() {
  const { data, loading, error, run } = useSkill('diagnose');
  const [text, setText] = useState('');
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (data) {
      if (
        !localStorage.getItem('hasAchievement') ||
        localStorage.getItem('hasAchievement') !== 'diagnose'
      ) {
        setShowBadge(true);
        localStorage.setItem('hasAchievement', 'diagnose');
      }
      if (!localStorage.getItem('hasDiagnosed')) {
        localStorage.setItem('hasDiagnosed', 'true');
      }
      const content = text || '双非大三学生，计算机专业，想做前端开发，暂时没有实习';
      const gradeMatch = content.match(/(大一|大二|大三|大四|研一|研二|研三)/);
      const majorMatch = content.match(
        /(计算机|软件|电子|通信|自动化|大数据|人工智能|数据科学|软件工程)/
      );
      const targetMatch = content.match(/(前端|后端|算法|测试|产品|运营|开发|工程师)/);
      const gapMatch = content.match(/(缺乏|没有|不足|不够|需要)/);
      const summary =
        [
          majorMatch?.[0] ? `${majorMatch[0]}专业` : '',
          gradeMatch?.[0] || '',
          targetMatch?.[0] ? `目标${targetMatch[0]}` : '',
          gapMatch ? '有明显差距' : '',
        ]
          .filter(Boolean)
          .join('，') || content.slice(0, 20);
      saveUserProfile(summary);
    }
  }, [data]);

  const start = () =>
    run({
      userId: 'local',
      messages: [
        { role: 'user', content: text || '双非大三学生，计算机专业，想做前端开发，暂时没有实习' },
      ],
    });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">破局诊断</h1>
      <p className="mt-2 text-ink/60">五维差距扫描 · 能力雷达图</p>
      <MemoryPanel skill="diagnose" />

      {showBadge && data && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-4 font-bold text-amber-800">
          <PartyPopper className="h-5 w-5 shrink-0" />
          初次诊断达成！你已迈出破局第一步
        </div>
      )}

      <Card className="mt-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="简单介绍你自己（专业 / 年级 / 目标岗位 / 现状）…"
          className="h-28 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={start}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '诊断中…' : '开始诊断'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="填写上方信息，生成你的五维能力雷达图" />}
      {loading && !data && <LoadingState label="正在扫描五维差距…" />}

      {data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>{data.radar && <RadarChart radar={data.radar} />}</Card>
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">推荐岗位</h3>
            <div className="mt-3 space-y-3">
              {data.recommendedRoles?.map((r, i) => (
                <div key={i} className="rounded-2xl border border-ink/10 bg-paper p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{r.role}</span>
                    <Pill tone="accent">匹配 {r.matchScore}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">{r.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            规划你的成长路径 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </main>
  );
}
