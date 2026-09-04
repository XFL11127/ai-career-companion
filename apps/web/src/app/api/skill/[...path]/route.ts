import { skillInputMap, skillNameSchema } from '@ai-career-companion/types';
import { streamSkill } from '@ai-career-companion/llm';
import { takeSkillRateLimit } from '@/lib/skill-rate-limit';

// 服务端 BFF：前端 → 本路由（Node 运行时）→ DeepSeek，以 NDJSON 流式返回（消除等待感）。
// 不再经由 Cloudflare Worker；DEEPSEEK_API_KEY 经 process.env 注入（部署平台环境变量）。
export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const name = path?.[0];
  const parsed = skillNameSchema.safeParse(name);
  if (!parsed.success) {
    return Response.json({ code: 404, message: 'unknown skill' }, { status: 404 });
  }

  const rateLimit = takeSkillRateLimit(req, parsed.data);
  if (!rateLimit.allowed) {
    return Response.json(
      { code: 429, message: 'too many Skill requests; retry shortly' },
      {
        status: 429,
        headers: {
          'cache-control': 'no-store',
          'retry-after': String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // 允许空 body（部分 skill 仅需默认推断）
  }

  const input = skillInputMap[parsed.data].safeParse(body);
  if (!input.success) {
    return Response.json(
      { code: 400, message: 'invalid Skill input' },
      { status: 400, headers: { 'cache-control': 'no-store' } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamSkill(parsed.data, input.data)) {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              done: true,
              data: null,
              error: e instanceof Error ? e.message : String(e),
            }) + '\n'
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
