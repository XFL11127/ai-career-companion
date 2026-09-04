import type { MemoryLayer, MemorySearchResponse } from '@ai-career-companion/types';

/**
 * Browser memory client. It only reaches the same-origin Next BFF; user identity is never accepted
 * here and is derived by the BFF after Supabase Auth has been introduced.
 */

/** Store a memory through the BFF once authenticated persistence is enabled. */
export async function storeMemory(
  content: string,
  layer: MemoryLayer = 'interaction'
): Promise<{ ok: boolean; id?: string; degraded?: boolean; reason?: string }> {
  const res = await fetch('/api/memory', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content, layer }),
  });
  const payload = (await res.json()) as {
    ok?: boolean;
    id?: string;
    degraded?: boolean;
    reason?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(payload.message ?? payload.reason ?? 'memory write failed');
  return {
    ok: payload.ok === true,
    id: payload.id,
    degraded: payload.degraded,
    reason: payload.reason,
  };
}

/** Search memory through the BFF; it reports an explicit keyword fallback until persistence is ready. */
export async function searchMemory(query: string, limit = 5): Promise<MemorySearchResponse> {
  const params = new URLSearchParams({ query, limit: String(limit) });
  const res = await fetch(`/api/memory?${params.toString()}`);
  const payload = (await res.json()) as MemorySearchResponse & { message?: string };
  if (!res.ok) throw new Error(payload.message ?? 'memory search failed');
  return payload;
}
