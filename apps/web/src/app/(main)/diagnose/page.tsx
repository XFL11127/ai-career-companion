'use client'
import { useState } from 'react'
import { useSkill } from '@/lib/useSkill'
import { RadarChart, Card, Pill, LoadingState, ErrorState, EmptyState } from '@/components/skill-ui'

export default function DiagnosePage() {
  const { data, loading, error, run } = useSkill('diagnose')
  const [text, setText] = useState('')

  const start = () =>
    run({
      userId: 'local',
      messages: [{ role: 'user', content: text || '双非大三学生，计算机专业，想做前端开发，暂时没有实习' }],
    })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">破局诊断</h1>
      <p className="mt-2 text-ink/60">五维差距扫描 · 能力雷达图</p>

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
          <Card>
            {data.radar && <RadarChart radar={data.radar} />}
          </Card>
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
    </main>
  )
}
