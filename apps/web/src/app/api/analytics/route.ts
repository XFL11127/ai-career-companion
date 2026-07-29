import { NextResponse } from 'next/server'

// 看板数据聚合（服务端）。
// Supabase 已配置 → 真查 skill_events / memory / user_profiles；
// 未配置 → 返回示例数据(demo:true)，保证界面可预览，上线接 Supabase 后自动变真数据。

type Analytic = {
  demo: boolean
  radar: { dimension: string; value: number }[]
  trend: { date: string; active: number }[]
  skillDist: { skill: string; count: number }[]
  profile: { label: string; value: number }[]
  profileOverall: number
}

const SAMPLE: Analytic = {
  demo: true,
  radar: [
    { dimension: '专业能力', value: 62 },
    { dimension: '实践经历', value: 41 },
    { dimension: '信息差', value: 55 },
    { dimension: '资源网络', value: 38 },
    { dimension: '信心', value: 70 },
  ],
  trend: Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000)
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, active: [0, 1, 0, 2, 1, 3, 1, 0, 2, 1, 4, 2, 1, 3][i] ?? 0 }
  }),
  skillDist: [
    { skill: '破局诊断', count: 18 },
    { skill: '路径规划', count: 12 },
    { skill: '实战练兵', count: 9 },
    { skill: '信息差填平', count: 7 },
    { skill: '成果包装', count: 5 },
  ],
  profile: [
    { label: '专业', value: 100 },
    { label: '年级', value: 100 },
    { label: '目标行业', value: 60 },
    { label: '目标岗位', value: 40 },
    { label: '兴趣方向', value: 80 },
  ],
  profileOverall: 76,
}

function sbHeaders(url: string, key: string) {
  return { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }
}

export async function GET() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json(SAMPLE)

  try {
    const out: Analytic = { ...SAMPLE, demo: false }

    // 差距雷达：memory 表 layer='diagnosis' 的最新一条（worker 写入）
    const mRes = await fetch(
      `${url}/rest/v1/memory?layer=eq.diagnosis&order=created_at.desc&limit=1`,
      { headers: sbHeaders(url, key) },
    )
    if (mRes.ok) {
      const rows = (await mRes.json()) as { content: string }[]
      if (rows[0]) {
        try {
          const radar = JSON.parse(rows[0].content) as { dimension: string; value: number }[]
          if (Array.isArray(radar)) out.radar = radar
        } catch {
          /* ignore */
        }
      }
    }

    // 活跃天数趋势：skill_events 近 14 天按日计数
    const since = new Date(Date.now() - 13 * 86400000).toISOString()
    const sRes = await fetch(
      `${url}/rest/v1/skill_events?select=created_at&created_at=gte.${since}`,
      { headers: sbHeaders(url, key) },
    )
    if (sRes.ok) {
      const rows = (await sRes.json()) as { created_at: string }[]
      const byDay = new Map<string, number>()
      for (const r of rows) {
        const d = new Date(r.created_at)
        const k = `${d.getMonth() + 1}/${d.getDate()}`
        byDay.set(k, (byDay.get(k) ?? 0) + 1)
      }
      out.trend = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(Date.now() - (13 - i) * 86400000)
        const k = `${d.getMonth() + 1}/${d.getDate()}`
        return { date: k, active: byDay.get(k) ?? 0 }
      })
      // Skill 使用分布
      const bySkill = new Map<string, number>()
      for (const r of rows) {
        const sk = (r as { skill_name?: string }).skill_name ?? 'unknown'
        bySkill.set(sk, (bySkill.get(sk) ?? 0) + 1)
      }
      out.skillDist = Array.from(bySkill.entries()).map(([skill, count]) => ({ skill, count }))
    }

    // 画像完成度
    const pRes = await fetch(`${url}/rest/v1/user_profiles?select=profile,completeness&limit=1`, {
      headers: sbHeaders(url, key),
    })
    if (pRes.ok) {
      const rows = (await pRes.json()) as { profile?: Record<string, unknown>; completeness?: number }[]
      if (rows[0]) {
        out.profileOverall = rows[0].completeness ?? out.profileOverall
        if (rows[0].profile) {
          out.profile = Object.entries(rows[0].profile).map(([label, v]) => ({
            label,
            value: typeof v === 'number' ? v : v ? 100 : 0,
          }))
        }
      }
    }

    return NextResponse.json(out)
  } catch {
    return NextResponse.json(SAMPLE)
  }
}
