// 服务端 L1 记忆存储（Mem0 兼容接口）。
//
// 召回升级（2026-07-23）：优先用 Cloudflare 免费中文 embedding 模型 @cf/baai/bge-m3
// （1024 维）做「语义余弦召回」；无 AI 绑定（本地 dev 未配 Cloudflare 账号）时自动回退到
// 「关键词 + 时间」召回，保证本地 `wrangler dev` 也能跑。
//
// 持久化：绑定 MEMORY_KV 后记忆跨 Worker 冷启动/多实例不丢；未绑定时退化为进程内内存。
//
// 设计参考：Mem0（记忆分层 perception/interaction/knowledge + search 接口形状）、
// Memobase（以用户画像为中心的 L2 长期记忆思路——本项目 L2 在前端 localStorage，不在本文件）。
//
// 为什么不装官方 mem0ai SDK：其向量召回默认依赖 OpenAI embedding（要钱要出网），且自托管类
// 重、依赖 Node 生态，跑在 Cloudflare Workers 不现实；托管版又要付费 Key。故自实现等价语义。

import type { Ai, KVNamespace } from '@cloudflare/workers-types'

export type MemoryLayer = 'perception' | 'interaction' | 'knowledge'

export interface MemoryItem {
  id: string
  userId: string
  content: string
  layer: MemoryLayer
  createdAt: string
  embedding?: number[]
}

type Env = { AI?: Ai; MEMORY_KV?: KVNamespace }

const KV_KEY = 'memories'
const EMBED_DIM = 1024
const SIM_THRESHOLD = 0.2 // 语义相似度低于此值视为“不相关”，回退关键词召回

/** 用 Cloudflare 免费 bge-m3 生成 1024 维向量；无 AI 绑定或调用失败时返回 null。 */
async function embed(text: string, env?: Env): Promise<number[] | undefined> {
  if (!env?.AI) return undefined
  try {
    const res = (await env.AI.run('@cf/baai/bge-m3', { text: [text] })) as {
      data?: number[][]
    }
    const vec = res?.data?.[0]
    return Array.isArray(vec) && vec.length === EMBED_DIM ? vec : undefined
  } catch {
    return undefined
  }
}

function cosine(a: number[], b: number[]): number {
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

// 同时支持中文（逐字）+ 英文/数字（按词）分词，保证中文关键词重叠可计算（关键词回退用）
function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[一-龥]|[a-z0-9]+/gi) ?? []
}

export class MemoryStore {
  private items: MemoryItem[] = []
  private loaded = false

  private async load(env?: Env): Promise<void> {
    if (this.loaded) return
    this.loaded = true
    if (!env?.MEMORY_KV) return
    try {
      const raw = await env.MEMORY_KV.get(KV_KEY)
      if (raw) this.items = JSON.parse(raw) as MemoryItem[]
    } catch {
      // KV 不可用时静默退化为内存，不阻断主流程
    }
  }

  private async persist(env?: Env): Promise<void> {
    if (!env?.MEMORY_KV) return
    try {
      await env.MEMORY_KV.put(KV_KEY, JSON.stringify(this.items))
    } catch {
      // 忽略持久化瞬时失败
    }
  }

  async add(
    userId: string,
    content: string,
    layer: MemoryLayer = 'interaction',
    env?: Env,
  ): Promise<MemoryItem> {
    await this.load(env)
    const item: MemoryItem = {
      id: crypto.randomUUID(),
      userId,
      content,
      layer,
      createdAt: new Date().toISOString(),
      embedding: await embed(content, env),
    }
    this.items.push(item)
    await this.persist(env)
    return item
  }

  async getAll(userId: string, env?: Env): Promise<MemoryItem[]> {
    await this.load(env)
    return this.items
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
  }

  async delete(id: string, env?: Env): Promise<boolean> {
    await this.load(env)
    const before = this.items.length
    this.items = this.items.filter((m) => m.id !== id)
    const changed = this.items.length < before
    if (changed) await this.persist(env)
    return changed
  }

  /**
   * 召回与 query 最相关的 topK 条。
   * 优先语义余弦（需 query 与全部记忆均有 embedding）；否则/相似度过低时回退关键词+时间，
   * 仍保证有历史上下文可注入。
   */
  async search(userId: string, query: string, topK = 5, env?: Env): Promise<MemoryItem[]> {
    await this.load(env)
    const owned = this.items.filter((m) => m.userId === userId)
    if (owned.length === 0) return []

    const qEmb = await embed(query, env)
    const canSemantic = qEmb !== undefined && owned.every((m) => m.embedding)

    if (canSemantic) {
      const scored = owned
        .map((m) => ({ m, score: cosine(qEmb as number[], m.embedding as number[]) }))
        .sort((a, b) => b.score - a.score)
      if (scored.slice(0, topK).some((t) => t.score >= SIM_THRESHOLD)) {
        return scored.slice(0, topK).map((t) => t.m)
      }
    }

    // 回退：关键词重叠 + 时间
    const qTokens = new Set(tokenize(query))
    const scored = owned.map((m) => {
      const mTokens = new Set(tokenize(m.content))
      let overlap = 0
      for (const t of mTokens) if (qTokens.has(t)) overlap++
      return { m, score: overlap }
    })
    scored.sort((a, b) => b.score - a.score || b.m.createdAt.localeCompare(a.m.createdAt))
    if (scored.every((t) => t.score === 0)) {
      return owned.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, topK)
    }
    return scored.slice(0, topK).map((t) => t.m)
  }
}

export const memoryStore = new MemoryStore()
