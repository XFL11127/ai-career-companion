'use client'

import { useEffect, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts'
import { Radar as RadarIcon, Activity, UserCircle, BarChart3, Loader2 } from 'lucide-react'

type Analytic = {
  demo: boolean
  configured: boolean
  source: 'supabase' | 'unconfigured'
  empty: boolean
  generatedAt: string
  error?: string
  kpis: {
    totalUsers: number
    totalEvents: number
    activeUsers7d: number
    todayEvents: number
    totalDiagnoses: number
  }
  radar: { dimension: string; value: number }[]
  trend: { date: string; active: number }[]
  skillDist: { skill: string; count: number }[]
  profile: { label: string; value: number }[]
  profileOverall: number
}

const INK = '#1F1B16'
const ACCENT = '#E0592E'
const FOREST = '#2E5E47'
const GOLD = '#E0A83E'

const SKILL_LABELS: Record<string, string> = {
  diagnose: '破局诊断',
  plan: '路径规划',
  practice: '实战练兵',
  info: '信息差填平',
  package: '成果包装',
  resume: '智能简历工坊',
  interview: '模拟面试舱',
  match: '岗位匹配雷达',
  course: '课程学习助手',
  assessment: '自我认知测评',
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-accent/15 bg-paper p-5 shadow-[0_18px_40px_-28px_rgba(31,27,22,0.4)]">
      <header className="mb-4 flex items-center gap-2 text-ink">
        <span className="text-accent">{icon}</span>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  )
}

function statusMeta(data: Analytic) {
  if (!data.configured) {
    return { label: '未配置 Supabase', className: 'border-accent/30 bg-accent/10 text-accent' }
  }
  if (data.empty) {
    return { label: 'Supabase 已连接 · 暂无事件', className: 'border-gold/40 bg-gold/10 text-gold' }
  }
  const time = new Date(data.generatedAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { label: `Supabase 实时数据 · ${time}`, className: 'border-forest/25 bg-forest/10 text-forest' }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/analytics', { cache: 'no-store' })
      .then(async (response) => ({ response, data: (await response.json()) as Analytic }))
      .then(({ response, data: next }) => {
        if (!alive) return
        if (!response.ok && !next.configured) throw new Error(next.error ?? 'analytics request failed')
        setData(next)
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-2 text-ink/60">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span>正在从 Supabase 聚合真实数据…</span>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-accent/30 bg-paper p-8 text-center text-ink/50">
          看板数据加载失败，请检查 Supabase 配置后重试。
        </div>
      </main>
    )
  }

  const status = statusMeta(data)
  const skillData = data.skillDist.map((item) => ({
    name: SKILL_LABELS[item.skill] ?? item.skill,
    count: item.count,
  }))
  const kpis = [
    ['总用户数', data.kpis.totalUsers],
    ['事件总数', data.kpis.totalEvents],
    ['7 日活跃', data.kpis.activeUsers7d],
    ['今日事件', data.kpis.todayEvents],
    ['诊断次数', data.kpis.totalDiagnoses],
  ] as const

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">数据看板</h1>
          <p className="mt-1 text-sm text-ink/60">
            Supabase 实时数据 · 活跃趋势 / 画像完成度 / Skill 使用分布
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </header>

      {data.error && (
        <div className="mb-4 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-accent">
          Supabase 查询失败：{data.error}
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-ink/10 bg-paper px-4 py-3">
            <p className="text-xs text-ink/50">{label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {data.empty && (
        <div className="mb-5 rounded-2xl border border-dashed border-gold/35 bg-gold/5 px-4 py-3 text-sm text-[#7d5b17]">
          Supabase 已连接，但还没有真实事件。完成一次页面访问、Skill 调用或登录后，看板会自动更新。
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="五维差距雷达" icon={<RadarIcon className="h-5 w-5" />}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={data.radar} outerRadius={90}>
              <PolarGrid stroke="rgba(31,27,22,0.12)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: INK, fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: INK, fontSize: 10 }} />
              <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="近 14 天活跃趋势" icon={<Activity className="h-5 w-5" />}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.trend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={FOREST} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={FOREST} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: INK, fontSize: 10 }} interval={1} />
              <YAxis tick={{ fill: INK, fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="active"
                stroke={FOREST}
                strokeWidth={2}
                fill="url(#activeFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="用户画像完成度" icon={<UserCircle className="h-5 w-5" />}>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <RadialBarChart
                innerRadius="68%"
                outerRadius="100%"
                data={[{ name: '完成度', value: data.profileOverall, fill: GOLD }]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" background={{ fill: 'rgba(31,27,22,0.08)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.profile.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-ink/70">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-ink/10">
                    <div className="h-1.5 rounded-full bg-gold" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Skill 使用分布" icon={<BarChart3 className="h-5 w-5" />}>
          {skillData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-ink/40">
              暂无 Skill 调用事件
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={skillData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fill: INK, fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: INK, fontSize: 11 }}
                  width={96}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {skillData.map((_, index) => (
                    <Cell key={index} fill={index % 2 === 0 ? ACCENT : GOLD} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </main>
  )
}
