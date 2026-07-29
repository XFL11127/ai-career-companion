'use client'
import { useEffect, useState } from 'react'
import { type SkillName, type SkillOutput } from '@ai-career-companion/types'
import { streamSkillCall } from './api'
import { loadResult, saveResult } from './db'
import { appendTurn, recallTurns, turnsToContext, getUserProfile, bumpStreak, getAnonUserId } from './memory'

/** 调用某个 Skill 的客户端 Hook：流式发请求 → 渐进渲染 → 本地缓存（IndexedDB）+ L1 会话记忆。 */
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
      // L1 会话记忆：召回近期轮次，注入 prompt（context 字段已被各 skill input schema 接受）
      const history = await recallTurns(name, 5).catch(() => [])
      const context = turnsToContext(history)
      const profile = getUserProfile()
      const enriched = { ...(input as Record<string, unknown>), context, profile, userId: getAnonUserId() }
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
      bumpStreak()
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, run }
}

