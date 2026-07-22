import { Hono } from 'hono'
import { healthSchema, skillInputMap, type SkillName } from '@ai-career-companion/types'
import { runSkill } from '@ai-career-companion/llm'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  DEEPSEEK_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// 健康检查
app.get('/health', (c) =>
  c.json(healthSchema.parse({ status: 'ok', time: new Date().toISOString() })),
)

// 记忆层（P1：L1 会话记忆核心在前端 IndexedDB；本路由预留服务端记忆，M3 接入 Supabase+pgvector）
// 本地用内存数组兜底演示，Worker 重启即清空（非持久化）。
let memStore: { id: string; userId: string; content: string; layer: string; createdAt: string }[] = []
app.get('/memory', (c) => {
  const userId = c.req.query('userId') ?? ''
  const items = memStore.filter((m) => m.userId === userId).slice(-20)
  return c.json({
    items,
    note: 'L1 会话记忆由前端 IndexedDB 承载；此处为服务端记忆占位，M3 接入 Supabase+pgvector 后生效',
  })
})
app.post('/memory', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    userId?: string
    content?: string
    layer?: string
  }
  const item = {
    id: crypto.randomUUID(),
    userId: body.userId ?? '',
    content: body.content ?? '',
    layer: body.layer ?? 'interaction',
    createdAt: new Date().toISOString(),
  }
  memStore.push(item)
  return c.json({ ok: true, id: item.id })
})

const SKILLS: SkillName[] = ['diagnose', 'plan', 'practice', 'info', 'package']

for (const name of SKILLS) {
  app.post(`/skill/${name}`, async (c) => {
    const parsed = skillInputMap[name].safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success) {
      return c.json({ code: 400, message: 'invalid input', detail: parsed.error.message }, 400)
    }
    // 真实链路：校验输入 → runSkill 真调 DeepSeek（无 Key 自动回落 stub）→ 输出
    const data = await runSkill(name, parsed.data, c.env)
    return c.json({ code: 0, message: 'ok', data })
  })
}

// 预留：结果持久化到 Supabase skill_sessions（基本功能阶段不连，填 key 即启用）
// async function saveSkillResult(name: SkillName, data: unknown) { ... }

export default app
