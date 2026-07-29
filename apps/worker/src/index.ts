import type { Ai } from '@cloudflare/workers-types'
import { healthSchema, skillInputMap, type SkillName } from '@ai-career-companion/types'
import { runSkill } from '@ai-career-companion/llm'

// 统一 Worker（零框架依赖，原生 fetch）。
// 合并自两队实现：
//  - 队长 master：零依赖单文件 + Supabase 记忆 + /api/embed(bge-m3)
//  - 本分支：五 Skill 路由 + /memory 语义召回(bge-m3)
// 现合并为一套：Skill 调 runSkill→DeepSeek；记忆 POST 落 Supabase(embedding 走 bge-m3)，
// GET 做余弦检索；Supabase 未配置时自动退化为进程内内存，保证本地可跑。

type Bindings = {
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  DEEPSEEK_API_KEY?: string
  // 可选：Workers AI（bge-m3 语义 embedding，免费）。未配置时记忆回退关键词召回。
  AI?: Ai
}

type MemoryRow = {
  id: string
  user_id: string
  content: string
  layer: string
  embedding: number[] | null
  created_at: string
}

// 内存兜底（Supabase 未配置时本地可跑）
const memFallback = new Map<string, MemoryRow[]>()

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}
async function parseBody(req: Request): Promise<Record<string, unknown>> {
  return (await req.json().catch(() => ({}))) as Record<string, unknown>
}

// bge-m3 向量（Cloudflare 免费，中文友好）
async function embed(text: string, env: Bindings): Promise<number[] | null> {
  if (!env.AI) return null
  try {
    const res = (await env.AI.run('@cf/baai/bge-m3', { text: [text] })) as {
      data?: number[][]
    }
    const v = res?.data?.[0]
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

function sbReady(env: Bindings): boolean {
  return !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY
}
function sbHeaders(env: Bindings, anon = false): Record<string, string> {
  const key = anon
    ? env.SUPABASE_ANON_KEY ?? ''
    : env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? ''
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_ANON_KEY ?? '',
  }
}

async function sbInsertMemory(row: MemoryRow, env: Bindings): Promise<boolean> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/memory`, {
    method: 'POST',
    headers: sbHeaders(env),
    body: JSON.stringify({
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      layer: row.layer,
      embedding: row.embedding,
      created_at: row.created_at,
    }),
  })
  return res.ok
}
async function sbSelectMemories(userId: string, env: Bindings, limit = 200): Promise<MemoryRow[] | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/memory?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`,
    { headers: sbHeaders(env, true) },
  )
  if (!res.ok) return null
  return (await res.json()) as MemoryRow[]
}
async function sbDeleteMemory(id: string, env: Bindings): Promise<boolean> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/memory?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: sbHeaders(env),
  })
  return res.ok
}

async function sbInsertSkillEvent(
  row: { id: string; user_id: string; skill_name: string; payload: object; created_at: string },
  env: Bindings,
): Promise<boolean> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/skill_events`, {
    method: 'POST',
    headers: sbHeaders(env),
    body: JSON.stringify({
      id: row.id,
      user_id: row.user_id,
      skill_name: row.skill_name,
      payload: row.payload,
      created_at: row.created_at,
    }),
  })
  return res.ok
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

async function handleMemory(req: Request, url: URL, env: Bindings): Promise<Response> {
  const method = req.method

  if (method === 'GET') {
    const userId = url.searchParams.get('userId') ?? ''
    const q = url.searchParams.get('q')
    const topK = Number(url.searchParams.get('topK') ?? '5') || 5
    let rows: MemoryRow[] =
      (sbReady(env) ? await sbSelectMemories(userId, env) : null) ?? memFallback.get(userId) ?? []
    if (q && rows.length) {
      const qEmb = await embed(q, env)
      if (qEmb) {
        const scored = rows
          .map((r) => ({ r, s: r.embedding ? cosine(qEmb, r.embedding) : 0 }))
          .sort((a, b) => b.s - a.s)
          .slice(0, topK)
        rows = scored.map((x) => x.r)
      } else {
        const kw = q.toLowerCase()
        rows = rows.filter((r) => r.content.toLowerCase().includes(kw)).slice(0, topK)
      }
    } else {
      rows = rows.slice(0, topK)
    }
    // embedding 仅服务端用于召回，响应剔除，避免把 1024 维向量下发浏览器
    const items = rows.map(({ embedding: _embedding, ...r }) => r)
    return json({ items, count: items.length })
  }

  if (method === 'POST') {
    const body = await parseBody(req)
    const content = body.content as string | undefined
    if (!content) return json({ ok: false, error: 'content required' }, 400)
    const row: MemoryRow = {
      id: crypto.randomUUID(),
      user_id: (body.userId as string) ?? '',
      content,
      layer: (body.layer as string) ?? 'interaction',
      embedding: await embed(content, env),
      created_at: new Date().toISOString(),
    }
    if (sbReady(env)) await sbInsertMemory(row, env)
    else {
      const arr = memFallback.get(row.user_id) ?? []
      arr.push(row)
      memFallback.set(row.user_id, arr)
    }
    return json({ ok: true, id: row.id })
  }

  if (method === 'DELETE') {
    const id = url.searchParams.get('id') ?? ((await parseBody(req)).id as string | undefined)
    if (!id) return json({ ok: false, error: 'id required' }, 400)
    if (sbReady(env)) await sbDeleteMemory(id, env)
    else {
      for (const [u, arr] of memFallback) memFallback.set(u, arr.filter((r) => r.id !== id))
    }
    return json({ ok: true })
  }

  return json({ ok: false, error: 'method not allowed' }, 405)
}

async function handleSkill(name: string, req: Request, env: Bindings): Promise<Response> {
  const skillName = name as SkillName
  const schema = skillInputMap[skillName]
  if (!schema) return json({ code: 404, message: 'unknown skill' }, 404)
  const body = (await parseBody(req)) as Record<string, unknown>
  const userId = (body.userId as string) ?? 'anon'
  // 剥掉 userId 再校验，避免严格 schema 因多余字段报错
  const { userId: _drop, ...rest } = body
  const parsed = schema.safeParse(rest)
  if (!parsed.success) {
    return json({ code: 400, message: 'invalid input', detail: parsed.error.message }, 400)
  }
  const data = await runSkill(skillName, parsed.data, {
    DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? '',
    SUPABASE_URL: env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY ?? '',
  })
  // 记录 Skill 调用事件（看板使用分布 / 活跃天数趋势），失败静默（Supabase 未配置时）
  if (sbReady(env)) {
    await sbInsertSkillEvent(
      {
        id: crypto.randomUUID(),
        user_id: userId,
        skill_name: skillName,
        payload: (rest as object) ?? {},
        created_at: new Date().toISOString(),
      },
      env,
    ).catch(() => {})
    // 诊断 Skill 把五维雷达写入 memory(layer=diagnosis)，供看板真实雷达图
    const radar = (data as { radar?: { dimension: string; value: number }[] })?.radar
    if (skillName === 'diagnose' && Array.isArray(radar)) {
      await sbInsertMemory(
        {
          id: crypto.randomUUID(),
          user_id: userId,
          content: JSON.stringify(radar),
          layer: 'diagnosis',
          embedding: null,
          created_at: new Date().toISOString(),
        },
        env,
      ).catch(() => {})
    }
  }
  return json({ code: 0, message: 'ok', data })
}

export default {
  async fetch(request: Request, env: Bindings) {
    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method

    if (method === 'GET' && pathname === '/health') {
      return json(healthSchema.parse({ status: 'ok', time: new Date().toISOString() }))
    }

    // 记忆：支持本分支 /memory 与队长约定 /api/memory、/api/memory/search
    if (pathname === '/memory' || pathname === '/api/memory') {
      return handleMemory(request, url, env)
    }
    if (pathname === '/api/memory/search' && method === 'POST') {
      const body = (await parseBody(request)) as { userId?: string; q?: string; topK?: number }
      const u = new URL(request.url)
      u.searchParams.set('userId', body.userId ?? '')
      u.searchParams.set('q', body.q ?? '')
      u.searchParams.set('topK', String(body.topK ?? 5))
      return handleMemory(new Request(u.toString(), { method: 'GET' }), u, env)
    }
    if (pathname === '/api/embed' && method === 'POST') {
      const { text } = (await parseBody(request)) as { text?: string }
      if (!text) return json({ error: 'text required' }, 400)
      const emb = await embed(text, env)
      if (!emb) return json({ error: 'AI binding unavailable' }, 503)
      return json({ embedding: emb })
    }

    // 五 Skill（Skill 0-4）
    const skillMatch = pathname.match(/^\/skill\/([a-z]+)$/)
    if (skillMatch && method === 'POST') {
      return handleSkill(skillMatch[1], request, env)
    }

    return json({ code: 404, message: 'not found' }, 404)
  },
}
