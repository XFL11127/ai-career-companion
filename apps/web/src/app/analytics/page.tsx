'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface SkillCount {
  skill_name: string
  count: number
}

interface DailyCount {
  day: string
  count: number
}

interface AnalyticsKpis {
  total_users: number
  total_sessions: number
  active_users_7d: number
  active_users_30d: number
  skill_counts: SkillCount[]
  daily_sessions_28d: DailyCount[]
}

const SKILL_LABELS: Record<string, string> = {
  diagnose: '破局诊断',
  plan: '路径规划',
  practice: '实战练兵',
  info: '信息差',
  package: '成果包装',
}

export default function AnalyticsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    let alive = true
    setFetching(true)
    setError(null)

    async function load() {
      try {
        const { data, error } = await supabase.rpc('get_analytics_kpis')
        if (!alive) return
        if (error) setError(error.message)
        else setKpis(data as AnalyticsKpis)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : '加载失败')
      } finally {
        if (alive) setFetching(false)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
      </div>
    )
  }

  if (!user) return null

  const skillCounts = kpis?.skill_counts ?? []
  const dailySessions = kpis?.daily_sessions_28d ?? []
  const maxSkill = Math.max(1, ...skillCounts.map((s) => s.count))
  const maxDaily = Math.max(1, ...dailySessions.map((d) => d.count))

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-semibold text-zinc-800">数据看板（运营端）</h1>
            <p className="text-xs text-zinc-400">用户增长 / Skill 使用 / 活跃度</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            返回首页
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-medium">数据加载失败</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-xs text-amber-600">
              提示：请先在 Supabase 控制台执行 supabase/migrations/005_analytics_kpis.sql 后再访问。
            </p>
          </div>
        )}

        {!error && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KpiCard label="总用户数" value={kpis?.total_users} />
              <KpiCard label="总调用次数" value={kpis?.total_sessions} />
              <KpiCard label="7 日活跃用户" value={kpis?.active_users_7d} />
              <KpiCard label="30 日活跃用户" value={kpis?.active_users_30d} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-3xl border border-zinc-200/60 bg-white p-6">
                <h2 className="text-sm font-semibold text-zinc-700">Skill 调用统计</h2>
                {fetching ? (
                  <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
                ) : skillCounts.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-400">暂无数据</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {skillCounts.map((s) => (
                      <li key={s.skill_name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-600">{SKILL_LABELS[s.skill_name] ?? s.skill_name}</span>
                          <span className="font-medium text-zinc-800">{s.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                            style={{ width: `${(s.count / maxSkill) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-zinc-200/60 bg-white p-6">
                <h2 className="text-sm font-semibold text-zinc-700">28 天调用活跃度</h2>
                {fetching ? (
                  <p className="py-10 text-center text-sm text-zinc-400">加载中…</p>
                ) : dailySessions.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-400">暂无数据</p>
                ) : (
                  <div className="mt-4 flex items-end gap-1">
                    {dailySessions.map((d) => (
                      <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}：${d.count} 次`}>
                        <span className="text-[10px] text-zinc-400">{d.count}</span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-emerald-400 to-teal-500"
                          style={{ height: `${Math.max(3, Math.round((d.count / maxDaily) * 80))}px` }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function KpiCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-3xl border border-zinc-200/60 bg-white p-5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-800">{value ?? '—'}</p>
    </div>
  )
}
