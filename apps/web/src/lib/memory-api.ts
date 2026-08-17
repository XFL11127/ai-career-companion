/**
 * Worker 记忆 API 客户端
 *
 * 封装对 Cloudflare Worker 的 /api/memory 和 /api/memory/search 接口调用。
 * 认证：登录后自动携带 Supabase access token（Authorization: Bearer <token>），
 *       Worker 侧校验 token 并取回真实 user_id，实现按用户隔离的语义记忆。
 * 未登录（匿名）时无 token，调用会返回 401，此处静默降级（不阻塞主流程）。
 */

const WORKER_BASE = process.env.NEXT_PUBLIC_WORKER_URL ?? ''

async function getAccessToken(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase')
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

/**
 * 存储一条记忆到 Supabase（Worker 生成 BGE-M3 向量 → 写入 pgvector）。
 * 当前用于将 Skill 交互中生成的结构化知识存入 L3。
 */
export async function storeMemory(content: string): Promise<{ ok: boolean; id?: string }> {
  try {
    const res = await fetch(`${WORKER_BASE}/api/memory`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ content }),
    })
    return await res.json()
  } catch {
    // Worker 不可达时静默降级（不阻塞主流程）
    return { ok: false }
  }
}

/**
 * 语义搜索记忆（Worker 生成查询向量 → Supabase pgvector 余弦相似度检索 Top K）。
 * 当前用于在 Skill 调用前检索相关历史知识。
 */
export async function searchMemory(
  query: string,
  limit = 5,
): Promise<{ results?: Array<{ id: string; content: string; similarity: number }> }> {
  try {
    const res = await fetch(`${WORKER_BASE}/api/memory/search`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ query, match_count: limit }),
    })
    return await res.json()
  } catch {
    return { results: [] }
  }
}
