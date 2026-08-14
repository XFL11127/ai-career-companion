'use client'
import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type SkillName } from '@ai-career-companion/types'
import { Radar, Route, Target, Newspaper, Briefcase, Send, Trash2, Menu, ClipboardList, CheckCircle2, Sparkles, Brain, Compass, Sword, Globe, Award } from 'lucide-react'
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

// ---------- 每个 Skill 的差异化卡片配置 ----------
// actionType: 'navigate' → 跳转详情页 | 'chat' → 在对话框内触发任务（自动填入 prompt）

type SkillCardConfig = {
  title: string
  desc: string
  action: string
} & (
  | { actionType: 'navigate'; href: string }
  | { actionType: 'chat'; chatPrompt: string }
)

const SKILL_CARDS: Record<SkillName, { sectionTitle: string; cards: SkillCardConfig[] }> = {
  diagnose: {
    sectionTitle: '破局诊断',
    cards: [
      { title: '开始五维诊断', desc: 'AI 分析你的能力差距，生成雷达图与推荐岗位', action: '开始诊断 →', actionType: 'chat', chatPrompt: '帮我做一次五维差距诊断，我是双非大三计算机专业学生' },
      { title: '查看诊断报告', desc: '回顾你的五维雷达图与岗位匹配分析', action: '查看详情 →', actionType: 'navigate', href: '/diagnose' },
      { title: '诊断 FAQ', desc: '什么是五维诊断？需要准备什么？', action: '了解更多 →', actionType: 'navigate', href: '/help#diagnose' },
    ],
  },
  plan: {
    sectionTitle: '路径规划',
    cards: [
      { title: '生成成长路径', desc: '基于诊断结果，生成 0-90 天可执行行动卡', action: '开始规划 →', actionType: 'chat', chatPrompt: '帮我制定一个 90 天的成长路径，目标是前端开发工程师' },
      { title: '查看行动卡进度', desc: '追踪你的里程碑完成情况', action: '查看进度 →', actionType: 'navigate', href: '/plan' },
      { title: '基于诊断结果规划', desc: '用已有的雷达数据做精准规划', action: '智能规划 →', actionType: 'chat', chatPrompt: '根据我之前的诊断结果，制定一个落地的提升计划' },
    ],
  },
  practice: {
    sectionTitle: '实战练兵',
    cards: [
      { title: '模拟面试', desc: '技术 + 行为混合面试，贴近校招真实节奏', action: '开始面试 →', actionType: 'chat', chatPrompt: '来一场模拟面试，综合模式' },
      { title: '算法刷题', desc: '出 1-2 道校招常见算法题，考思路与编码', action: '刷题 →', actionType: 'chat', chatPrompt: '出几道算法题练练，数组或字符串相关的' },
      { title: '项目深挖', desc: '围绕你做过的项目问技术细节与量化结果', action: '项目复盘 →', actionType: 'chat', chatPrompt: '深挖一下我的项目经历，像面试官那样追问' },
    ],
  },
  info: {
    sectionTitle: '信息差填平',
    cards: [
      { title: '最新校招资讯', desc: '获取双非友好的实习 / 校招 / 竞赛机会', action: '获取资讯 →', actionType: 'chat', chatPrompt: '' },
      { title: '双非友好企业清单', desc: '不卡学历的公司和岗位汇总', action: '查看列表 →', actionType: 'navigate', href: '/info' },
      { title: '秋招时间线', desc: '关键节点与投递策略指南', action: '了解时间线 →', actionType: 'navigate', href: '/help#recruitment' },
    ],
  },
  package: {
    sectionTitle: '成果包装',
    cards: [
      { title: '优化我的简历', desc: '粘贴简历原文，AI 帮你改写成 ATS 友好版', action: '开始优化 →', actionType: 'chat', chatPrompt: '帮我把简历优化一下，目标岗位是前端开发' },
      { title: '项目亮点提炼', desc: '把经历讲成 STAR 结构的量化成果', action: '提炼亮点 →', actionType: 'chat', chatPrompt: '帮我把项目经历包装成面试能用的亮点' },
      { title: '面试复盘模板', desc: '被问到学校时怎么接？表达模板在这里', action: '查看模板 →', actionType: 'navigate', href: '/package' },
    ],
  },
}

/** 获取当前 Skill 的图标（用于卡片区域标题装饰） */
function SkillIcon({ name, className }: { name: SkillName; className?: string }) {
  const iconMap: Record<SkillName, ComponentType<{ className?: string }>> = {
    diagnose: Brain,
    plan: Compass,
    practice: Sword,
    info: Globe,
    package: Award,
  }
  const Icon = iconMap[name] ?? Radar
  return <Icon className={className} />
}

export function ChatShell() {
  const router = useRouter()
  const [skill, setSkill] = useState<SkillName>('diagnose')
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convKey, setConvKey] = useState(0)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [progress, setProgress] = useState({ diagnosed: false, planned: false })
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
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

  /** 处理 Skill 卡片点击：跳转页面对话框内触发 */
  const handleCardClick = (card: SkillCardConfig) => {
    if (card.actionType === 'navigate') {
      router.push(card.href)
    } else {
      setPendingPrompt(card.chatPrompt)
    }
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
            <SkillIcon name={skill} className="h-4 w-4 text-amber-600" />
            {SKILL_CARDS[skill].sectionTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SKILL_CARDS[skill].cards.map((card) => (
              <button
                key={card.title}
                onClick={() => handleCardClick(card)}
                className="block w-full text-left bg-amber-50 border border-amber-200 rounded-lg p-3 hover:border-amber-300 transition cursor-pointer"
              >
                <h3 className="font-medium text-gray-900 text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{card.desc}</p>
                <span className="text-amber-700 hover:text-amber-900 text-xs font-medium">
                  {card.action}
                </span>
              </button>
            ))}
          </div>
        </section>

        <ChatRoom
          key={`${skill}:${convKey}`}
          skill={skill}
          placeholder={current.placeholder}
          activeConversationId={activeConvId}
          pendingPrompt={pendingPrompt}
          onPendingPromptConsumed={() => setPendingPrompt(null)}
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
  pendingPrompt,
  onPendingPromptConsumed,
  onMessagesChange,
  onClear,
}: {
  skill: SkillName
  placeholder: string
  activeConversationId: string | null
  pendingPrompt: string | null
  onPendingPromptConsumed: () => void
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

  // 处理从 Skill 卡片触发的对话（pendingPrompt 由父组件传入）
  useEffect(() => {
    if (pendingPrompt && pendingPrompt.trim() && !streaming) {
      onPendingPromptConsumed()
      send(pendingPrompt)
    }
  }, [pendingPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

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
