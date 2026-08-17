'use client'

import { useAuth } from '@/lib/auth'
import { Streak } from '@/components/growth/streak'
import { SkillHeatmap } from '@/components/growth/heatmap'
import { RadarTrend } from '@/components/growth/radar-trend'
import { loadProfile } from '@/lib/profile'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    const profile = loadProfile()
    setNickname(profile.nickname || user?.email?.split('@')[0] || '同学')
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-zinc-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-lg">
              🎓
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-800">成长仪表盘</h1>
              <p className="text-xs text-zinc-400">Hi，{nickname}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            返回首页
          </button>
        </div>
      </header>

      {/* 内容区 */}
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* 第一行：雷达 + 热力图 */}
        <div className="grid gap-6 md:grid-cols-2">
          <RadarTrend />
          <SkillHeatmap />
        </div>

        {/* 第二行：活跃日历 */}
        <Streak />

        {/* 底部引导 */}
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white/40 p-8 text-center">
          <p className="text-sm text-zinc-400">
            数据来源于你的每一次 Skill 使用。
            <br />
            登录后可在不同设备间同步，数据永不丢失。
          </p>
        </div>
      </main>
    </div>
  )
}
