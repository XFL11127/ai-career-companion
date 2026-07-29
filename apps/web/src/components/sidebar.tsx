'use client'

import { useEffect, useMemo, useState } from 'react'
import { getUserProfile, getStreak } from '@/lib/memory'
import Link from 'next/link'
import type { ComponentType } from 'react'
import type { SkillName } from '@ai-career-companion/types'
import { MessageSquarePlus, Settings, HelpCircle, LogIn, X, Trash2, Flame, Brain } from 'lucide-react'
import type { Conversation } from '@/lib/memory'

interface SkillItem {
  name: SkillName
  label: string
  icon: ComponentType<{ className?: string }>
}

interface SidebarProps {
  open: boolean
  onClose: () => void
  skills: SkillItem[]
  activeSkill: SkillName
  onSkillChange: (name: SkillName) => void
  conversations: Conversation[]
  onNewConversation: () => void
  onSelectConversation: (conv: Conversation) => void
  onDeleteConversation: (id: string) => void
}

function groupConversations(convs: Conversation[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 24 * 60 * 60 * 1000
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000
  const groups = [
    { label: '今天', items: [] as Conversation[] },
    { label: '昨天', items: [] as Conversation[] },
    { label: '7 天内', items: [] as Conversation[] },
    { label: '更早', items: [] as Conversation[] },
  ]
  for (const c of convs) {
    const t = c.updatedAt
    if (t >= today) groups[0].items.push(c)
    else if (t >= yesterday) groups[1].items.push(c)
    else if (t >= weekAgo) groups[2].items.push(c)
    else groups[3].items.push(c)
  }
  return groups.filter((g) => g.items.length > 0)
}

export function Sidebar({
  open,
  onClose,
  skills,
  activeSkill,
  onSkillChange,
  conversations,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: SidebarProps) {
  const groups = useMemo(() => groupConversations(conversations), [conversations])
  const [streak, setStreak] = useState(0)
  const [showMemory, setShowMemory] = useState(false)

  // 仅读取展示（streak 的实际累加在 useChat/useSkill 调用成功时完成）
  useEffect(() => {
    setStreak(getStreak())
  }, [])

  const handleSkill = (name: SkillName) => {
    onSkillChange(name)
    onClose()
  }

  const handleSelect = (conv: Conversation) => {
    onSelectConversation(conv)
    onClose()
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink/10 bg-paper transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-paper">AI</div>
            <span className="font-serif text-sm font-bold text-ink">学职同伴</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-ink/50 hover:bg-ink/5 lg:hidden" aria-label="关闭侧边栏">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={() => {
            onNewConversation()
            onClose()
          }}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-paper py-2 text-sm font-medium text-ink transition hover:border-accent/40 hover:text-accent"
        >
          <MessageSquarePlus className="h-4 w-4" />
          新建会话
        </button>

        <nav className="px-2">
          <div className="space-y-0.5">
            {skills.map((s) => {
              const Icon = s.icon
              const active = s.name === activeSkill
              return (
                <button
                  key={s.name}
                  onClick={() => handleSkill(s.name)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                    active ? 'bg-accent/10 font-medium text-accent' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="mt-2 px-4">
          <div className="h-px bg-ink/10" />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="mb-2 px-3 text-xs font-medium text-ink/40">对话</div>
          {groups.length === 0 && <div className="px-3 py-4 text-xs text-ink/40">暂无历史会话</div>}
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <div className="px-3 pb-1 text-xs text-ink/40">{g.label}</div>
              <div className="space-y-0.5">
                {g.items.map((conv) => (
                  <div
                    key={conv.id}
                    className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink/80 hover:bg-ink/5 hover:text-ink"
                  >
                    <button onClick={() => handleSelect(conv)} className="flex-1 truncate text-left">
                      {conv.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteConversation(conv.id)
                      }}
                      className="rounded p-1 text-ink/40 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      title="删除"
                      aria-label="删除会话"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-ink/10 p-2">
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-ink/50">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            连续活跃 {streak} 天
          </div>
          <button
            type="button"
            onClick={() => setShowMemory(true)}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-sm text-accent transition hover:bg-ink/5"
          >
            <Brain className="h-4 w-4" />
            记忆已开启
          </button>
          <div className="space-y-0.5">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/70 transition hover:bg-ink/5 hover:text-ink">
              <Settings className="h-4 w-4" />
              设置
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/70 transition hover:bg-ink/5 hover:text-ink">
              <HelpCircle className="h-4 w-4" />
              帮助
            </button>
          </div>
          <Link
            href="/login"
            className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            <LogIn className="h-4 w-4" />
            登录
          </Link>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} aria-hidden="true" />}

      {showMemory && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowMemory(false)}
          role="dialog"
          aria-modal="true"
          aria-label="我的记忆"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-ink/10 bg-paper p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink">
                <Brain className="h-4 w-4 text-accent" />
                我的记忆
              </h3>
              <button
                type="button"
                onClick={() => setShowMemory(false)}
                className="rounded p-1 text-ink/50 transition hover:bg-ink/5"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">
              {getUserProfile() || '暂无记忆。完成一次诊断后，这里会记录你的职业画像。'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
