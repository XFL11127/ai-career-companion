'use client'
import { useEffect, useState } from 'react'
import { type SkillName } from '@ai-career-companion/types'
import { streamSkillCall } from './api'
import { loadMessages, appendMessage, clearMessages, saveMessages, bumpStreak, getAnonUserId, type ChatMessage } from './memory'

/** 把自由文本 + 历史上下文，构造成对应 Skill 的输入。 */
function buildInput(name: SkillName, text: string, context: string[]): Record<string, unknown> {
  switch (name) {
    case 'diagnose':
      return { userId: getAnonUserId(), messages: [{ role: 'user', content: text }], context }
    case 'plan':
      return { goal: text, context }
    case 'practice': {
      const mode = /算法/.test(text) ? 'algorithm' : /项目/.test(text) ? 'project' : 'interview'
      return { mode, topic: text, context }
    }
    case 'info':
      return { userId: getAnonUserId(), context }
    case 'package':
      return { resumeText: text, context }
  }
}

/**
 * Kimi 式对话 Hook：管理某 Skill 下的消息流，调用流式端点，边生成边渲染，
 * 并把历史 transcript 注入 prompt（L1 会话记忆），同时持久化到 IndexedDB（免登即用）。
 */
export function useChat(name: SkillName) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 进入某 Skill 模式时，从 IndexedDB 恢复该模式的可见历史
  useEffect(() => {
    let alive = true
    loadMessages(name)
      .then((m) => {
        if (alive) setMessages(m)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [name])

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || streaming) return
    setError(null)

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: t, skill: name, ts: Date.now() }
    const assistantId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      card: null,
      skill: name,
      done: false,
      ts: Date.now(),
    }

    // 用历史（用户消息 + 已完成的 AI 消息）拼上下文注入 prompt
    const history = messages.filter((m) => m.role === 'user' || m.done)
    const localCtx = history.slice(-12).map((m) => (m.role === 'user' ? `用户：${m.content}` : `AI：${m.content}`))
    // 召回服务端长期记忆（跨会话/跨设备），并入上下文；失败则忽略，不阻断主链路
    let serverCtx: string[] = []
    try {
      const r = await fetch(`/api/memory?userId=${encodeURIComponent(getAnonUserId())}&q=${encodeURIComponent(t)}&topK=3`)
      const j = await r.json().catch(() => null)
      if (j && Array.isArray(j.items)) serverCtx = j.items.map((m: { content: string }) => `[长期记忆] ${m.content}`)
    } catch {
      serverCtx = []
    }
    const context = [...localCtx, ...serverCtx].slice(-14)

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)
    await appendMessage(name, userMsg).catch(() => {})

    let acc: Record<string, unknown> | null = null
    let accReply = ''
    try {
      for await (const chunk of streamSkillCall(name, buildInput(name, t, context))) {
        if (chunk.error) throw new Error(chunk.error)
        const d = chunk.data as Record<string, unknown> | null
        if (d) {
          acc = d as Record<string, unknown>
          if (typeof d.reply === 'string') accReply = d.reply
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accReply, card: acc ?? null, done: chunk.done } : m,
          ),
        )
      }
      const finalMsg: ChatMessage = { ...assistantMsg, content: accReply, card: acc, done: true }
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? finalMsg : m)))
      await appendMessage(name, finalMsg).catch(() => {})
      bumpStreak()
      // 写入服务端长期记忆（fire-and-forget，不阻塞 UI；Worker 未部署时静默失败）
      fetch('/api/memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: getAnonUserId(), content: `用户：${t} | AI：${accReply}`, layer: 'interaction' }),
      }).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败')
      const failMsg: ChatMessage = {
        ...assistantMsg,
        content: accReply || '生成失败，请稍后重试。',
        done: true,
      }
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? failMsg : m)))
      await appendMessage(name, failMsg).catch(() => {})
    } finally {
      setStreaming(false)
    }
  }

  const reset = async () => {
    setMessages([])
    await clearMessages(name).catch(() => {})
  }

  const load = async (msgs: ChatMessage[]) => {
    setMessages(msgs)
    await saveMessages(name, msgs).catch(() => {})
  }

  return { messages, streaming, error, send, reset, load }
}
