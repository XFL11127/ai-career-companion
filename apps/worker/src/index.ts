import { Hono } from 'hono'
import type { Ai, KVNamespace } from '@cloudflare/workers-types'
import { healthSchema, skillInputMap, type SkillName } from '@ai-career-companion/types'
import { runSkill } from '@ai-career-companion/llm'
import { memoryStore, type MemoryLayer } from './memory/store'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  DEEPSEEK_API_KEY: string
  // 可选：Workers AI（bge-m3 语义 embedding，免费）。未配置时 store 自动回退关键词召回。
  AI?: Ai
  // 可选：长期记忆持久化（跨冷启动）。未绑定则退化为进程内内存。
  MEMORY_KV?: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// 健康检查
app.get('/health', (c) =>
  c.json(healthSchema.parse({ status: 'ok', time: new Date().toISOString() })),
)

// 记忆层（L1：服务端记忆，Mem0 兼容接口）。
// 召回：优先 Cloudflare bge-m3 语义余弦；无 AI 绑定时自动回退关键词+时间。
// 持久化：绑定 MEMORY_KV 后跨冷启动不丢；否则退化为进程内内存。
// 前端 IndexedDB 承载会话级 L1；此处为跨会话/跨设备的服务端记忆，登录后可作为长期记忆底子。
// 注：embedding 仅服务端用于召回，响应中剔除，避免把 1024 维向量下发到浏览器。
app.get('/memory', async (c) => {
  const userId = c.req.query('userId') ?? ''
  const q = c.req.query('q')
  const topK = Number(c.req.query('topK') ?? '5') || 5
  const items = q
    ? await memoryStore.search(userId, q, topK, c.env)
    : await memoryStore.getAll(userId, c.env)
  const publicItems = items.map(({ embedding: _embedding, ...rest }) => rest)
  return c.json({ items: publicItems, count: publicItems.length })
})
app.post('/memory', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    userId?: string
    content?: string
    layer?: string
  }
  if (!body.content) return c.json({ ok: false, error: 'content required' }, 400)
  const layer = (body.layer as MemoryLayer) ?? 'interaction'
  const item = await memoryStore.add(body.userId ?? '', body.content, layer, c.env)
  return c.json({ ok: true, id: item.id })
})
app.delete('/memory', async (c) => {
  const id = c.req.query('id') ?? ((await c.req.json().catch(() => ({}))) as { id?: string }).id
  if (!id) return c.json({ ok: false, error: 'id required' }, 400)
  return c.json({ ok: await memoryStore.delete(id, c.env) })
})

const SKILLS: SkillName[] = ['diagnose', 'plan', 'practice', 'info', 'package']

for (const name of SKILLS) {
  app.post(`/skill/${name}`, async (c) => {
    const parsed = skillInputMap[name].safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success) {
      return c.json({ code: 400, message: 'invalid input', detail: parsed.error.message }, 400)
    }
    // 真实链路：校验输入 → runSkill 真调 DeepSeek（无 Key 自动回落 stub）→ 输出
    const data = await runSkill(name, parsed.data, {
      DEEPSEEK_API_KEY: c.env.DEEPSEEK_API_KEY,
      SUPABASE_URL: c.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
    })
    return c.json({ code: 0, message: 'ok', data })
  })
}

// 预留：结果持久化到 Supabase skill_sessions（基本功能阶段不连，填 key 即启用）
// async function saveSkillResult(name: SkillName, data: unknown) { ... }

export default app
