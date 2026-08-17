/**
 * 滑动窗口限流（内存版）。
 * 用途：防止 LLM API 被恶意刷量。
 *
 * 说明：当前为单进程内存实现，适合本地开发 / 竞赛演示。
 * 生产化可替换为 Upstash Redis / Cloudflare KV，保持 `checkRateLimit(key)` 接口不变即可。
 */

interface Window {
  hits: number[]
}

const windows = new Map<string, Window>()
const MAX_KEYS = 5000

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

export function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number } = { max: 30, windowMs: 60_000 },
): RateLimitResult {
  const now = Date.now()
  let w = windows.get(key)
  if (!w) {
    w = { hits: [] }
    windows.set(key, w)
  }

  // 淘汰窗口外的旧时间戳
  w.hits = w.hits.filter((t) => now - t < opts.windowMs)

  if (w.hits.length >= opts.max) {
    return { allowed: false, remaining: 0 }
  }

  w.hits.push(now)

  // 防止 Map 无限增长：超阈值时清理最久未用的一条
  if (windows.size > MAX_KEYS) {
    const oldest = windows.keys().next().value
    if (oldest !== undefined) windows.delete(oldest)
  }

  return { allowed: true, remaining: opts.max - w.hits.length }
}
