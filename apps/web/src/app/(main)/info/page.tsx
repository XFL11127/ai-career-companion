'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSkill } from '@/lib/useSkill'
import { ArrowRight, PartyPopper } from 'lucide-react'
import { saveUserProfile } from '@/lib/memory'
import { Card, Pill, LoadingState, ErrorState, EmptyState } from '@/components/skill-ui'

export default function InfoPage() {
  const { data, loading, error, run } = useSkill('info')
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-info-shown')) {
        setShowBadge(true)
        localStorage.setItem('badge-info-shown', 'true')
      }
      const roles = data.jobs?.map(j => j.role) || []
      const summary = roles.length > 0
        ? `关注岗位：${roles.slice(0, 2).join('、')}`
        : '正在搜索双非友好机会'
      saveUserProfile(summary)
    }
  }, [data])

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">信息差填平</h1>
      <p className="mt-2 text-ink/60">聚合双非友好的校招 / 实习 / 竞赛信息</p>

      {showBadge && data && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="mr-1.5 inline h-5 w-5 align-[-2px]" />信息聚合达成！双非友好机会已为你准备
        </div>
      )}

      <Card className="mt-6">
        <button
          onClick={() => run({ userId: 'local' })}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '聚合中…' : '聚合双非友好信息'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={() => run({ userId: 'local' })} />}
      {!error && !data && !loading && <EmptyState label="点击上方按钮，获取最新双非友好机会" />}
      {loading && !data && <LoadingState label="正在聚合信息…" />}

      {data && (
        <div className="mt-6 space-y-3">
          {data.jobs?.map((j, i) => (
            <Link
              key={i}
              href={`/company/${encodeURIComponent(j.company)}`}
              className="card-lift block rounded-3xl border border-ink/10 bg-white/70 p-5 transition hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-ink">
                  {j.role} · {j.company}
                </div>
                <Pill tone="forest">{j.salary}</Pill>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <span>{j.location}</span>
                {j.tags?.map((t, ti) => (
                  <Pill key={ti} tone="gold">
                    {t}
                  </Pill>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <Link href="/package" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600">
            包装你的成果 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </main>
  )
}
