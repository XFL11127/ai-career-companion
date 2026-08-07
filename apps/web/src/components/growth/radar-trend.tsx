'use client'

import { loadProfile } from '@/lib/profile'
import { useEffect, useState } from 'react'
import type { SkillGap } from '@/lib/profile'

/**
 * 能力雷达趋势：展示当前五维诊断结果 + 历史对比占位。
 * 登录后可叠加多次诊断的多边形图层，直观显示进步。
 */
export function RadarTrend() {
  const [gaps, setGaps] = useState<SkillGap[]>([])
  const [overallScore, setOverallScore] = useState<number | null>(null)
  const [weakest, setWeakest] = useState<string | null>(null)

  useEffect(() => {
    const profile = loadProfile()
    if (profile.skillGaps && profile.skillGaps.length > 0) {
      setGaps(profile.skillGaps)
      setOverallScore(profile.overallScore ?? null)
      setWeakest(profile.weakestDimension ?? null)
    }
  }, [])

  if (!gaps.length) {
    return (
      <div className="rounded-3xl border border-zinc-200/60 bg-white/70 p-6 backdrop-blur">
        <h3 className="mb-4 text-sm font-medium text-zinc-700">能力雷达</h3>
        <p className="py-10 text-center text-sm text-zinc-400">
          完成一次「破局诊断」后显示
        </p>
      </div>
    )
  }

  const cx = 140
  const cy = 140
  const R = 100
  const n = gaps.length
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, v: number): [number, number] => {
    const r = (Math.max(0, Math.min(100, v)) / 100) * R
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  }
  const poly = (key: 'current' | 'target') =>
    gaps.map((d, i) => pt(i, d[key]).join(',')).join(' ')

  return (
    <div className="rounded-3xl border border-zinc-200/60 bg-white/70 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">能力雷达</h3>
        {overallScore !== null && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
            综合 {overallScore} 分
          </span>
        )}
      </div>
      <svg viewBox="0 0 280 280" className="mx-auto h-auto w-full max-w-[280px]">
        {[1, 0.66, 0.33].map((f, gi) => (
          <polygon
            key={gi}
            points={gaps.map((_, i) => pt(i, 100 * f).join(',')).join(' ')}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={1}
          />
        ))}
        {gaps.map((_, i) => {
          const [x, y] = pt(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e4e4e7" strokeWidth={1} />
        })}
        <polygon points={poly('target')} fill="rgba(5,150,105,0.08)" stroke="rgba(5,150,105,0.6)" strokeWidth={1.5} strokeDasharray="4 3" />
        <polygon points={poly('current')} fill="rgba(16,185,129,0.18)" stroke="rgb(16,185,129)" strokeWidth={2} />
        {gaps.map((d, i) => {
          const [x, y] = pt(i, 118)
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-600 text-[11px]">
              {d.name}
              <tspan className="fill-emerald-500"> {d.current}</tspan>
            </text>
          )
        })}
      </svg>
      {weakest && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          当前最大短板：<span className="text-amber-500 font-medium">{weakest}</span>
        </p>
      )}
    </div>
  )
}
