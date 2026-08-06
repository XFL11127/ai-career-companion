'use client'
import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { type SkillName } from '@ai-career-companion/types'
import { Radar, Route, Target, Newspaper, Briefcase, Send, Trash2, Menu, ClipboardList, CheckCircle2, Sparkles } from 'lucide-react'
import { useChat } from '@/lib/useChat'
import { Sidebar } from '@/components/sidebar'
import {
  loadConversations,
  deleteConversation,
  archiveCurrentConversation,
  clearMessages,
  saveMessages,
  migrateLegacyChats,
  type Conversation,
  type ChatMessage,
} from '@/lib/memory'
import { ProseBubble, SkillCardView, ErrorState, EmptyState } from '@/components/skill-ui'

const SKILLS: {
  name: SkillName
  label: string
  icon: ComponentType<{ className?: string }>
  placeholder: string
}[] = [
  { name: 'diagnose', label: '破局诊断', icon: Radar, placeholder: '介绍下你自己：专业 / 年级 / 目标岗位 / 现状…' },
  { name: 'plan', label: '路径规划', icon: Route, placeholder: '你的目标是什么？比如“想做前端工程师”' },
  { name: 'practice', label: '实战练兵', icon: Target, placeholder: '想练什么？面试 / 算法 / 项目（可留空直接回车）' },
  { name: 'info', label: '信息差', icon: Newspaper, placeholder: '回车获取双非友好的校招 / 实习信息' },
  { name: 'package', label: '成果包装', icon: Briefcase, placeholder: '粘贴你的简历原文，并说明目标岗位…' },
]

export function ChatShell() {
  const [skill, setSkill] = useState<SkillName>('diagnose')
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convKey, setConvKey] = useState(0)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [progress, setProgress] = useState({ diagnosed: false, planned: false })
  const msgsRef = useRef<ChatMessage[]>([])
  const current = SKILLS.find((s) => s.name === skill)!

  // 初始化：迁移旧版数据 + 载入会话历史（免登即用）
  useEffect(() => {
    let alive = true
    ;(async () => {
      await migrateLegacyChats(SKILLS.map((s) => s.name)).catch(() => {})
      const list = await loadConversations().catch(() => [])
      if (alive) setConversations(list)
    })()
    return () => {
      alive = false
    }
  }, [])

  // 读取进度标志，驱动「今日行动」卡与轻提醒（数据驱动，不再写死）
  useEffect(() => {
    setProgress({
      diagnosed: localStorage.getItem('hasDiagnosed') === 'true',
      planned: localStorage.getItem('hasPlanned') === 'true',
    })
  }, [])

  const refreshConversations = async () => {
    const list = await loadConversations().catch(() => [])
    setConversations(list)
  }

  // 切换上下文前，把当前「工作会话」归档进历史（正在查看历史会话时不重复归档）
  const commitCurrent = async () => {
    if (activeConvId) return
    const msgs = msgsRef.current
    if (msgs.length > 0) {
      await archiveCurrentConversation(skill, msgs).catch(() => {})
      await clearMessages(skill).catch(() => {})
      await refreshConversations()
      msgsRef.current = []
    }
  }

  const handleNew = async () => {
    await commitCurrent()
    await clearMessages(skill).catch(() => {})
    setActiveConvId(null)
    msgsRef.current = []
    setConvKey((k) => k + 1)
    setOpen(false)
  }

  const handleSkillChange = async (name: SkillName) => {
    await commitCurrent()
    setActiveConvId(null)
    setSkill(name)
    setConvKey((k) => k + 1)
    setOpen(false)
  }

  const handleSelect = async (conv: Conversation) => {
    await commitCurrent()
    await saveMessages(conv.skill, conv.messages).catch(() => {})
    setActiveConvId(conv.id)
    setSkill(conv.skill as SkillName)
    setConvKey((k) => k + 1)
    setOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deleteConversation(id).catch(() => {})
    await refreshConversations()
    if (activeConvId === id) {
      setActiveConvId(null)
      await clearMessages(skill).catch(() => {})
      msgsRef.current = []
      setConvKey((k) => k + 1)
    }
  }

  const handleClear = async () => {
    if (activeConvId) {
      // 正在查看某条历史会话：垃圾桶 = 删除该会话
      await deleteConversation(activeConvId).catch(() => {})
      await refreshConversations()
      setActiveConvId(null)
      await clearMessages(skill).catch(() => {})
      msgsRef.current = []
      setConvKey((k) => k + 1)
      return
    }
    await clearMessages(skill).catch(() => {})
    msgsRef.current = []
    setConvKey((k) => k + 1)
  }

  return (
    <div className="flex h-[100dvh]">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        skills={SKILLS}
        activeSkill={skill}
        onSkillChange={handleSkillChange}
        conversations={conversations}
        onNewConversation={handleNew}
        onSelectConversation={handleSelect}
        onDeleteConversation={handleDelete}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-ink/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg p-1.5 text-ink/60 transition hover:bg-ink/5 lg:hidden"
              aria-label="打开侧边栏"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-serif text-lg font-bold text-ink">{current.label}</h1>
              <p className="text-xs text-ink/50">AI学职同伴 · 对话式入口</p>
            </div>
          </div>
          <Link href={`/${skill}`} className="text-xs text-ink/50 underline hover:text-accent">
            打开详情页
          </Link>
        </header>

        <section className="px-4 py-4 border-b border-amber-100">
          <h2 className="flex items-center gap-1.5 font-serif text-sm font-medium text-gray-700 mb-3">
            <ClipboardList className="h-4 w-4 text-amber-600" />
            今日行动
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              { title: '完善职业画像', desc: '详细描述职业背景与目标', action: '立即完善', href: '/diagnose' },
              progress.diagnosed
                ? { title: '回顾你的五维雷达', desc: '查看能力差距与推荐岗位', action: '查看诊断', href: '/diagnose' }
                : { title: '试试破局诊断', desc: 'AI 分析职业困境并提供方案', action: '开始诊断', href: '/diagnose' },
              progress.planned
                ? { title: '追踪成长进度', desc: '查看你的里程碑完成情况', action: '查看进度', href: '/plan' }
                : { title: '规划成长路径', desc: '生成 0-90 天行动卡', action: '开始规划', href: '/plan' },
            ] as { title: string; desc: string; action: string; href: string }[]).map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="block bg-amber-50 border border-amber-200 rounded-lg p-3 hover:border-amber-300 transition"
              >
                <h3 className="font-medium text-gray-900 text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{card.desc}</p>
                <span className="text-amber-700 hover:text-amber-900 text-xs font-medium">
                  {card.action} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ChatRoom
          key={`${skill}:${convKey}`}
          skill={skill}
          placeholder={current.placeholder}
          activeConversationId={activeConvId}
          onMessagesChange={(m) => {
            msgsRef.current = m
          }}
          onClear={handleClear}
        />
      </main>
    </div>
  )
}

function ChatRoom({
  skill,
  placeholder,
  activeConversationId,
  onMessagesChange,
  onClear,
}: {
  skill: SkillName
  placeholder: string
  activeConversationId: string | null
  onMessagesChange: (m: ChatMessage[]) => void
  onClear: () => void
}) {
  const { messages, streaming, error, send } = useChat(skill)
  const [text, setText] = useState('')
  const [hasDiagnosed, setHasDiagnosed] = useState(false)
  const [hasPlanned, setHasPlanned] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasDiagnosed(localStorage.getItem('hasDiagnosed') === 'true')
    setHasPlanned(localStorage.getItem('hasPlanned') === 'true')
  }, [])

  useEffect(() => {
    onMessagesChange(messages)
  }, [messages, onMessagesChange])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const submit = () => {
    if (!text.trim() || streaming) return
    send(text)
    setText('')
  }

  const clearLabel = activeConversationId ? '删除此会话' : '清空对话'

  return (
    <>
      <section className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !streaming && (
          <EmptyState label="和 AI学职同伴聊聊吧 —— 选一个模式，直接说你的困惑" />
        )}
        {error && <ErrorState message={error} onRetry={() => send(text)} />}
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-2">
            <ProseBubble tone={m.role}>
              {m.content || (m.role === 'assistant' && !m.done ? '正在思考…' : '')}
            </ProseBubble>
            {m.role === 'assistant' && m.card != null && <SkillCardView name={skill} data={m.card} />}
          </div>
        ))}
        <div ref={endRef} />
      </section>

      <Link
        href={hasDiagnosed ? '/plan' : '/diagnose'}
        className="shrink-0 flex items-center gap-1.5 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 text-sm text-amber-800"
      >
        {!hasDiagnosed ? (
          <>
            <Sparkles className="h-4 w-4" />
            你今天还没诊断哦，试试破局诊断吧 →
          </>
        ) : hasPlanned ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            诊断与规划都完成啦，保持节奏持续成长 →
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            你已经完成诊断，去规划你的成长路径吧 →
          </>
        )}
      </Link>

      <footer className="shrink-0 border-t border-ink/10 px-4 pb-4 pt-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <button
            onClick={onClear}
            title={clearLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ink/15 text-ink/60 transition hover:border-red-300 hover:text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={streaming || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-paper transition hover:bg-[#c94a23] disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </>
  )
}
