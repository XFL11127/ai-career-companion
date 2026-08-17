import { skillNameSchema } from '@ai-career-companion/types'
import { streamSkill, runSkill } from '@ai-career-companion/llm'
import { checkRateLimit } from '@/lib/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'

// BFF 代理层：前端 → 本路由 → Cloudflare Worker(/skill/*) → DeepSeek
// 本地未起 wrangler（Worker 不可达）时，直连 streamSkill（Node 兜底），以 NDJSON 流式返回，消除等待感。

/** 提取客户端 IP（本地开发无代理时为 ::1，统一回退为 local） */
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'local'
}

/** 诊断结果缓存键：用户 + 自述内容（稳定部分），避免 context/profile 变化导致缓存失效 */
function diagnoseCacheKey(body: Record<string, unknown>): string {
  const userId = (body.userId as string) ?? 'anon'
  const messages = body.messages as Array<{ content?: string }> | undefined
  const content = messages?.[0]?.content ?? ''
  return `diagnose:${userId}:${content}`
}

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  const name = params.path?.[0]
  const parsed = skillNameSchema.safeParse(name)
  if (!parsed.success) {
    return Response.json({ code: 404, message: 'unknown skill' }, { status: 404 })
  }

  // 1. 限流：防止 LLM API 被恶意刷量
  const rl = checkRateLimit(`skill:${clientIp(req)}`)
  if (!rl.allowed) {
    return Response.json({ code: 429, message: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  const raw = await req.text()
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    /* ignore */
  }

  // 2. 高频诊断结果缓存：命中直接返回，不再调用 LLM
  if (parsed.data === 'diagnose') {
    const cacheKey = diagnoseCacheKey(body)
    const cached = cacheGet<unknown>(cacheKey)
    if (cached !== undefined) {
      return Response.json({ code: 0, data: cached })
    }
    const result = await runSkill('diagnose', body)
    cacheSet(cacheKey, result, 5 * 60_000)
    return Response.json({ code: 0, data: result })
  }

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:8787'
  try {
    const res = await fetch(`${workerUrl}/skill/${parsed.data}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
    })
    if (!res.ok) throw new Error(`worker ${res.status}`)
    return Response.json(await res.json())
  } catch {
    // Worker 不可达 → 直连 LLM 兜底（本地开发默认走这里），流式返回 partial
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of streamSkill(parsed.data, body)) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          }
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ done: true, data: null, error: e instanceof Error ? e.message : String(e) }) + '\n',
            ),
          )
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    })
  }
}
