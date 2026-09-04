import type { Ai } from '@cloudflare/workers-types';
import {
  embeddingRequestSchema,
  embeddingResponseSchema,
  healthSchema,
} from '@ai-career-companion/types';

/**
 * This Worker is an internal BGE-M3 adapter, not a browser-facing business API.
 * Browser requests must go through the Next.js BFF, which authenticates the user and
 * owns all Supabase reads/writes. Keeping this narrow prevents client-supplied user IDs
 * and service-role credentials from becoming a data access path.
 */
type Bindings = {
  AI?: Ai;
  INTERNAL_WORKER_SECRET?: string;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { headers: jsonHeaders, status });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

async function digest(value: string): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return new Uint8Array(hash);
}

/** Compare hashes rather than tokens so unauthorized callers cannot learn token prefixes. */
async function hasInternalAccess(request: Request, env: Bindings): Promise<boolean> {
  const secret = env.INTERNAL_WORKER_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || !authorization?.startsWith('Bearer ')) return false;

  const supplied = authorization.slice('Bearer '.length);
  const [expectedDigest, suppliedDigest] = await Promise.all([digest(secret), digest(supplied)]);
  let difference = expectedDigest.length ^ suppliedDigest.length;
  for (let index = 0; index < Math.max(expectedDigest.length, suppliedDigest.length); index += 1) {
    difference |= (expectedDigest[index] ?? 0) ^ (suppliedDigest[index] ?? 0);
  }
  return difference === 0;
}

async function embed(request: Request, env: Bindings): Promise<Response> {
  if (!(await hasInternalAccess(request, env))) {
    return json({ code: 401, message: 'internal authorization required' }, 401);
  }

  const input = embeddingRequestSchema.safeParse(await readJson(request));
  if (!input.success) {
    return json({ code: 400, message: 'invalid embedding request' }, 400);
  }
  if (!env.AI) {
    return json(
      {
        code: 503,
        message: 'embedding service unavailable',
        degraded: true,
        reason: 'workers_ai_binding_unavailable',
      },
      503
    );
  }

  try {
    const result = (await env.AI.run('@cf/baai/bge-m3', { text: input.data.texts })) as {
      data?: unknown;
    };
    const parsed = embeddingResponseSchema.safeParse({
      embeddings: result.data,
      model: '@cf/baai/bge-m3',
      degraded: false,
    });
    if (!parsed.success || parsed.data.embeddings.length !== input.data.texts.length) {
      return json(
        {
          code: 503,
          message: 'embedding service returned an invalid response',
          degraded: true,
          reason: 'embedding_response_invalid',
        },
        503
      );
    }
    return json(parsed.data);
  } catch {
    return json(
      {
        code: 503,
        message: 'embedding service unavailable',
        degraded: true,
        reason: 'embedding_provider_error',
      },
      503
    );
  }
}

export default {
  async fetch(request: Request, env: Bindings): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (request.method === 'GET' && pathname === '/health') {
      return json(
        healthSchema.parse({
          status: 'ok',
          time: new Date().toISOString(),
          components: { embedding: env.AI ? 'ready' : 'unavailable' },
        })
      );
    }

    if (request.method === 'POST' && pathname === '/internal/embed') {
      return embed(request, env);
    }

    return json({ code: 404, message: 'not found' }, 404);
  },
};
