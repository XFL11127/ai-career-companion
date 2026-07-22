import { skillNameSchema } from '@ai-career-companion/types'
import { streamSkill } from '@ai-career-companion/llm'

// BFF 代理层：前端 → 本路由 → Cloudflare Worker(/skill/*) → DeepSeek
// 本地未起 wrangler（Worker 不可达）时，直连 streamSkill（Node 兜底），以 NDJSON 流式返回，消除等待感。
export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  const name = params.path?.[0]
  const parsed = skillNameSchema.safeParse(name)
  if (!parsed.success) {
    return Response.json({ code: 404, message: 'unknown skill' }, { status: 404 })
  }

  const raw = await req.text()
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
    let body: unknown = {}
    try {
      body = JSON.parse(raw)
    } catch {
      /* ignore */
    }
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
