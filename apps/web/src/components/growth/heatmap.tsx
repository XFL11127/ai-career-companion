'use client'

import { loadProfile } from '@/lib/profile'
import { useEffect, useState } from 'react'

interface SkillUsage {
  name: string
  label: string
  count: number
  color: string
}

const SKILL_META = [
  { name: 'diagnose', label: '诊断', color: 'bg-emerald-500' },
  { name: 'plan', label: '规划', color: 'bg-blue-500' },
  { name: 'practice', label: '练兵', color: 'bg-violet-500' },
  { name: 'info', label: '信息', color: 'bg-amber-500' },
  { name: 'package', label: '包装', color: 'bg-rose-500' },
]

/**
 * Skill 使用热力图：展示 5 个 Skill 的使用频率。
 * 登录后可叠加历史数据展示趋势。
 */
export function SkillHeatmap() {
  const [usage, setUsage] = useState<SkillUsage[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const profile = loadProfile()
    const data: SkillUsage[] = SKILL_META.map((m) => {
      let count = 0
      switch (m.name) {
        case 'diagnose': count = profile.totalDiagnoses; break
        case 'plan': count = profile.totalPlans; break
        case 'practice': count = profile.totalPractices; break
        case 'info': count = profile.totalInfo; break
        case 'package': count = profile.totalPackages; break
      }
      return { ...m, count }
    })
    setUsage(data)
    setTotal(data.reduce((s, d) => s + d.count, 0))
  }, [])

  const maxCount = Math.max(...usage.map((u) => u.count), 1)

  return (
    <div className="rounded-3xl border border-zinc-200/60 bg-white/70 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">Skill 使用</h3>
        <span className="text-xs text-zinc-400">共 {total} 次</span>
      </div>
      <div className="space-y-3">
        {usage.map((u) => (
          <div key={u.name} className="flex items-center gap-3">
            <span className="w-10 text-xs text-zinc-500">{u.label}</span>
            <div className="flex-1">
              <div className="h-6 w-full overflow-hidden rounded-md bg-zinc-100">
                <div
                  className={`h-full ${u.color} rounded-md transition-all`}
                  style={{ width: `${(u.count / maxCount) * 100}%`, minWidth: u.count > 0 ? '8px' : '0' }}
                />
              </div>
            </div>
            <span className="w-6 text-right text-xs font-medium text-zinc-600">{u.count}</span>
          </div>
        ))}
      </div>
      {total === 0 && (
        <p className="mt-4 text-center text-xs text-zinc-400">
          开始使用 Skill 后自动统计
        </p>
      )}
    </div>
  )
}
