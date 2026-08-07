'use client'

import { loadProfile } from '@/lib/profile'
import { useEffect, useState } from 'react'

interface DayCell {
  date: string
  dayOfMonth: number
  level: 0 | 1 | 2 | 3 | 4 // 活跃度
}

export function Streak() {
  const [cells, setCells] = useState<DayCell[]>([])
  const [streakDays, setStreakDays] = useState(0)

  useEffect(() => {
    const profile = loadProfile()
    setStreakDays(profile.totalDiagnoses + profile.totalPlans + profile.totalPractices > 0 ? 1 : 0)

    // 生成最近 28 天网格（纯展示，后续接入 Supabase streak_days 后真实渲染）
    const now = new Date()
    const days: DayCell[] = []
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      // 根据 profile 命中模拟热度
      const total =
        (i <= 0 ? profile.totalDiagnoses : 0) +
        (i <= 1 ? profile.totalPlans : 0) +
        (i <= 2 ? profile.totalPractices : 0)
      const level = total > 3 ? 4 : total > 2 ? 3 : total > 1 ? 2 : total > 0 ? 1 : 0
      days.push({
        date: d.toISOString().slice(0, 10),
        dayOfMonth: d.getDate(),
        level: level as 0 | 1 | 2 | 3 | 4,
      })
    }
    setCells(days)
  }, [])

  const levelColors = [
    'bg-zinc-200 dark:bg-zinc-800',
    'bg-emerald-200 dark:bg-emerald-900/40',
    'bg-emerald-300 dark:bg-emerald-800/50',
    'bg-emerald-400 dark:bg-emerald-700/60',
    'bg-emerald-500 dark:bg-emerald-600',
  ]

  return (
    <div className="rounded-3xl border border-zinc-200/60 bg-white/70 p-6 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">活跃日历</h3>
        <span className="text-xs text-zinc-400">{cells.length} 天</span>
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-emerald-500">{streakDays}</span>
        <span className="text-sm text-zinc-400">天连续活跃</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
          <div key={d} className="text-center text-[10px] text-zinc-400">
            {d}
          </div>
        ))}
        {cells.map((cell) => (
          <div
            key={cell.date}
            className={`aspect-square rounded-sm ${levelColors[cell.level]}`}
            title={`${cell.date}: ${cell.level} 活跃度`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
        少
        {levelColors.map((c, i) => (
          <div key={i} className={`h-2.5 w-2.5 rounded-sm ${c}`} />
        ))}
        多
      </div>
    </div>
  )
}
