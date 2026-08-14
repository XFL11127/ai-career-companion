/**
 * Worker 记忆 API 客户端
 *
 * 封装对 Cloudflare Worker 的 /api/memory 和 /api/memory/search 接口调用。
 * 当前 MVP 阶段前端调用此 API 进行 L3 知识记忆的存储与检索（通过 pgvector 语义搜索）。
 * Worker URL 通过环境变量或默认值配置。
 */

const WORKER_BASE = process.env.NEXT_PUBLIC_WORKER_URL ?? '';

/**
 * 存储一条记忆到 Supabase（Worker 生成 BGE-M3 向量 → 写入 pgvector）。
 * 当前 MVP 阶段用于将 Skill 交互中生成的结构化知识存入 L3。
 */
export async function storeMemory(
  userId: string,
  content: string
): Promise<{ ok: boolean; id?: string }> {
  try {
    const res = await fetch(`${WORKER_BASE}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content }),
    });
    return await res.json();
  } catch {
    // Worker 不可达时静默降级（不阻塞主流程）
    return { ok: false };
  }
}

/**
 * 语义搜索记忆（Worker 生成查询向量 → Supabase pgvector 余弦相似度检索 Top K）。
 * 当前 MVP 阶段用于在 Skill 调用前检索相关历史知识。
 */
export async function searchMemory(
  userId: string,
  query: string,
  limit = 5
): Promise<{ results?: Array<{ id: string; content: string; similarity: number }> }> {
  try {
    const res = await fetch(`${WORKER_BASE}/api/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, query, match_count: limit }),
    });
    return await res.json();
  } catch {
    return { results: [] };
  }
}
