'use client'
import { useEffect, useState } from 'react'
import { type SkillName, type SkillOutput } from '@ai-career-companion/types'
import { streamSkillCall } from './api'
import { loadResult, saveResult } from './db'
import { appendTurn, recallTurns, turnsToContext, getUserProfile } from './memory'
import { updateFromSkillResult, loadProfile, type SkillNameInput } from './profile'
import { searchL3Knowledge } from './l3-knowledge'

/** 从 input 中提取可搜索的文本片段（用于 L3 关键词匹配）。 */
function inputTextFromUnknown(input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const obj = input as Record<string, unknown>
  return [obj.goal, obj.topic, obj.resumeText, obj.targetRole]
    .map((v) => (typeof v === 'string' ? v : ''))
    .filter(Boolean)
    .join(' ')
}

/** 调用某个 Skill 的客户端 Hook：流式发请求 → 渐进渲染 → 本地缓存（IndexedDB）+ L1/L2/L3 三层记忆。 */
export function useSkill<N extends SkillName>(name: N) {
  const [data, setData] = useState<SkillOutput<N> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 进入页面时先读本地缓存，命中则直接展示（免登即用）
  useEffect(() => {
    loadResult(name)
      .then((d) => {
        if (d) setData(d as SkillOutput<N>)
      })
      .catch(() => {})
  }, [name])

  const run = async (input: unknown) => {
    setLoading(true)
    setError(null)
    try {
      // L1 会话记忆：召回近期轮次
      const history = await recallTurns(name, 5).catch(() => [])
      const l1Context = turnsToContext(history)

      // L2 交互记忆：读取用户画像摘要注入 prompt
      const profileData = loadProfile()
      const profile = profileData.summary || getUserProfile() || undefined

      // L3 知识记忆：关键词匹配静态知识库（MVP 降级方案，未来升级为 pgvector 语义搜索）
      const inputText = inputTextFromUnknown(input)
      const l3Items = searchL3Knowledge(inputText, name)
      const context = [...l1Context, ...(l3Items.length ? [`【L3知识检索】`, ...l3Items.slice(0, 2)] : [])]

      const enriched = { ...(input as Record<string, unknown>), context, profile }
      let finalData: SkillOutput<N> | null = null
      // 流式：每收到一个 partial 就更新 data，UI 边生成边渲染，首段几百毫秒即到
      for await (const chunk of streamSkillCall(name, enriched)) {
        if (chunk.data) setData(chunk.data as SkillOutput<N>)
        if (chunk.done && chunk.data) finalData = chunk.data as SkillOutput<N>
      }
      if (!finalData) throw new Error('未获取到结果')
      setData(finalData)
      await saveResult(name, finalData).catch(() => {})
      await appendTurn(name, { input: enriched, output: finalData, ts: Date.now() }).catch(() => {})
      // L2 交互记忆：Skill 成功后自动更新用户画像
      updateFromSkillResult(name as SkillNameInput, finalData, profileData)
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, run }
}
