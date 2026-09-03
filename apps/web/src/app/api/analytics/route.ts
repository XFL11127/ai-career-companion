import { type NextRequest, NextResponse } from 'next/server';

// 看板数据聚合（服务端）。
// Supabase 已配置 → 真查 skill_events / memory / user_profiles；
// 未配置 → 返回示例数据(demo:true)，保证界面可预览，上线接 Supabase 后自动变真数据。
//
// 支持 ?days=7|14|30（默认 14），并额外返回 recentEvents（最近事件明细），
// 供前端「任务流卡片」渲染。注意：前端在存在本地埋点时会优先使用本地数据，
// 本接口是真数据（云端）来源，两者并存由前端 analytics/page.tsx 的 hasLocal 判定。

type RecentEvent = {
  id: string;
  skill_name: string;
  created_at: string;
  payload?: Record<string, unknown>;
};

type Analytic = {
  demo: boolean;
  days: number;
  radar: { dimension: string; value: number }[];
  trend: { date: string; active: number }[];
  skillDist: { skill: string; count: number }[];
  profile: { label: string; value: number }[];
  profileOverall: number;
  recentEvents: RecentEvent[];
};

const RANGE_OPTIONS = [7, 14, 30] as const;

/** 解析并校验 days 参数，非法值回退 14。 */
function parseDays(raw: string | null): number {
  const n = Number(raw);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? n : 14;
}

/** 示例趋势：按 days 长度循环复用基准序列，保证 7/14/30 切换都有形状。 */
function sampleTrend(days: number): { date: string; active: number }[] {
  const base = [0, 1, 0, 2, 1, 3, 1, 0, 2, 1, 4, 2, 1, 3];
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      active: base[i % base.length],
    };
  });
}

function sampleAnalytic(days:number): Analytic {
  return {
    demo: true,
    days,
    radar: [
      { dimension: '专业能力', value: 62 },
      { dimension: '实践经历', value: 41 },
      { dimension: '信息差', value: 55 },
      { dimension: '资源网络', value: 38 },
      { dimension: '信心', value: 70 },
    ],
    trend: sampleTrend(days),
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
    recentEvents: [],
  };
}

function sbHeaders(key: string) {
  return { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' };
}

export async function GET(request: NextRequest) {
  const days = parseDays(request.nextUrl.searchParams.get('days'));

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json(sampleAnalytic(days));

  try {
    const out: Analytic = { ...sampleAnalytic(days), demo: false };

    // 差距雷达：memory 表 layer='diagnosis' 的最新一条（worker 写入）
    const mRes = await fetch(
      `${url}/rest/v1/memory?layer=eq.diagnosis&order=created_at.desc&limit=1`,
      { headers: sbHeaders(key) }
    );
    if (mRes.ok) {
      const rows = (await mRes.json()) as { content: string }[];
      if (rows[0]) {
        try {
          const radar = JSON.parse(rows[0].content) as { dimension: string; value: number }[];
          if (Array.isArray(radar)) out.radar = radar;
        } catch {
          /* ignore */
        }
      }
    }

    // Skill 事件：一次查询同时供趋势聚合、Skill 分布、任务流明细使用
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString();
    const sRes = await fetch(
      `${url}/rest/v1/skill_events?select=id,skill_name,created_at,payload&created_at=gte.${since}&order=created_at.desc`,
      { headers: sbHeaders(key) }
    );
    if (sRes.ok) {
      const rows = (await sRes.json()) as RecentEvent[];

      // 活跃天数趋势：按天计数，无数据的天补 0
      const byDay = new Map<string, number>();
      const bySkill = new Map<string, number>();
      for (const r of rows) {
        const d = new Date(r.created_at);
        const k = `${d.getMonth() + 1}/${d.getDate()}`;
        byDay.set(k, (byDay.get(k) ?? 0) + 1);
        const sk = r.skill_name ?? 'unknown';
        bySkill.set(sk, (bySkill.get(sk) ?? 0) + 1);
      }
      out.trend = Array.from({ length: days }).map((_, i) => {
        const d = new Date(Date.now() - (days - 1 - i) * 86400000);
        const k = `${d.getMonth() + 1}/${d.getDate()}`;
        return { date: k, active: byDay.get(k) ?? 0 };
      });
      out.skillDist = Array.from(bySkill.entries()).map(([skill, count]) => ({ skill, count }));

      // 任务流明细：最近 10 条
      out.recentEvents = rows.slice(0, 10);
    }

    // 画像完成度
    const pRes = await fetch(`${url}/rest/v1/user_profiles?select=profile,completeness&limit=1`, {
      headers: sbHeaders(key),
    });
    if (pRes.ok) {
      const rows = (await pRes.json()) as {
        profile?: Record<string, unknown>;
        completeness?: number;
      }[];
      if (rows[0]) {
        out.profileOverall = rows[0].completeness ?? out.profileOverall;
        if (rows[0].profile) {
          out.profile = Object.entries(rows[0].profile).map(([label, v]) => ({
            label,
            value: typeof v === 'number' ? v : v ? 100 : 0,
          }));
        }
      }
    }

    return NextResponse.json(out);
  } catch {
    return NextResponse.json(sampleAnalytic(days));
  }
}
