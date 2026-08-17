/**
 * 带 TTL 的内存缓存。
 * 用途：缓存高频诊断结果，避免重复调用 LLM 产生费用。
 *
 * 说明：当前为单进程内存实现，适合本地开发 / 竞赛演示。
 * 生产化可替换为 Upstash Redis / Cloudflare KV，保持 get/set 接口不变即可。
 */

interface Entry {
  value: unknown
  expireAt: number
}

const store = new Map<string, Entry>()
const MAX_KEYS = 2000

export function cacheGet<T = unknown>(key: string): T | undefined {
  const e = store.get(key)
  if (!e) return undefined
  if (Date.now() > e.expireAt) {
    store.delete(key)
    return undefined
  }
  return e.value as T
}

export function cacheSet(key: string, value: unknown, ttlMs = 5 * 60_000): void {
  store.set(key, { value, expireAt: Date.now() + ttlMs })

  // 防止 Map 无限增长：超阈值时清理最久未用的一条
  if (store.size > MAX_KEYS) {
    const oldest = store.keys().next().value
    if (oldest !== undefined) store.delete(oldest)
  }
}
