import { type SkillName, type SkillOutput } from '@ai-career-companion/types'

/** 非流式封装（保留给 Worker 可达路径 / 简单调用）。 */
export async function postSkill<N extends SkillName>(name: N, input: unknown): Promise<SkillOutput<N>> {
  const res = await fetch(`/api/skill/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message ?? 'skill request failed')
  return json.data as SkillOutput<N>
}

export type StreamChunk<N extends SkillName> = {
  done: boolean
  data: Partial<SkillOutput<N>> | null
  error?: string
}

/**
 * 流式消费 BFF 的 Skill 响应：
 * - BFF 流式路径返回 NDJSON（每行一个 {done,data}），逐行解析并 yield partial，UI 边生成边渲染。
 * - Worker 可达路径返回单条 JSON，退化为一次 yield 完成。
 */
export async function* streamSkillCall<N extends SkillName>(
  name: N,
  input: unknown,
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk<N>> {
  const res = await fetch(`/api/skill/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('ndjson')) {
    const json = await res.json()
    if (json.code !== 0) throw new Error(json.message ?? 'skill request failed')
    yield { done: true, data: (json.data ?? null) as Partial<SkillOutput<N>> | null }
    return
  }
  if (!res.body) throw new Error('no response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl)
      buf = buf.slice(nl + 1)
      if (!line.trim()) continue
      try {
        const chunk = JSON.parse(line) as { done: boolean; data: unknown; error?: string }
        if (chunk.error) throw new Error(chunk.error)
        yield { done: chunk.done, data: (chunk.data ?? null) as Partial<SkillOutput<N>> | null }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
  yield { done: true, data: null }
}
