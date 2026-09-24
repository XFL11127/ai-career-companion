'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Card } from '@/components/skill-ui'
import { Chip } from '@/components/feature-ui'

type ApplicationItem = {
  id: string
  company: string
  role: string
  url: string
  matchScore: number
  status: '待核对' | '待人工投递' | '已投递' | '已回复' | '已结束'
  notes: string
  createdAt: number
}

const STORAGE_KEY = 'career_application_queue'
const STATUSES: ApplicationItem['status'][] = ['待核对', '待人工投递', '已投递', '已回复', '已结束']

export default function ApplyPage() {
  const [items, setItems] = useState<ApplicationItem[]>([])
  const [form, setForm] = useState({ company: '', role: '', url: '', matchScore: 0, notes: '' })

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ApplicationItem[])
    } catch {
      setItems([])
    }
  }, [])

  const persist = (next: ApplicationItem[]) => {
    setItems(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const add = () => {
    if (!form.company.trim() || !form.role.trim()) return
    const item: ApplicationItem = {
      id: crypto.randomUUID(),
      company: form.company.trim(),
      role: form.role.trim(),
      url: form.url.trim(),
      matchScore: form.matchScore,
      status: form.matchScore >= 75 ? '待人工投递' : '待核对',
      notes: form.notes.trim(),
      createdAt: Date.now(),
    }
    persist([item, ...items])
    setForm({ company: '', role: '', url: '', matchScore: 0, notes: '' })
  }

  const updateStatus = (id: string, status: ApplicationItem['status']) => {
    persist(items.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">A1 · Human-gated Apply</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-ink">人工门控投递清单</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
            汇总候选岗位、匹配分和材料状态。系统不会登录 BOSS / 智联 / 猎聘，也不会自动批量投递。
          </p>
        </div>
        <div className="max-w-md rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs leading-5 text-accent">
          <ShieldCheck className="mr-1 inline h-4 w-4" />
          安全边界：低分岗位只进入核对清单；所有最终投递动作由用户本人完成。
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-lg font-bold text-ink">添加候选岗位</h2>
          </div>
          <input value={form.company} onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))} placeholder="公司" className="mt-4 w-full rounded-xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent" />
          <input value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} placeholder="岗位名称" className="mt-3 w-full rounded-xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent" />
          <input value={form.url} onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))} placeholder="岗位链接（可选）" className="mt-3 w-full rounded-xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent" />
          <label className="mt-3 block text-xs text-ink/55">
            最近一次匹配分：{form.matchScore}
            <input type="range" min="0" max="100" value={form.matchScore} onChange={(e) => setForm((prev) => ({ ...prev, matchScore: Number(e.target.value) }))} className="mt-2 w-full accent-[rgb(var(--accent))]" />
          </label>
          <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="备注：需要补的关键词、联系人、截止时间…" className="mt-3 h-24 w-full rounded-xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent" />
          <button onClick={add} disabled={!form.company.trim() || !form.role.trim()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm text-paper disabled:opacity-45">
            <Plus className="h-4 w-4" /> 加入清单
          </button>
          <Link href="/match" className="mt-3 flex items-center gap-1 text-xs text-forest hover:underline">
            先去岗位匹配雷达计算五维分 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <div className="space-y-5">
          <Card className="bg-gradient-to-br from-white/80 to-forest/5">
            <h2 className="font-serif text-lg font-bold text-ink">投递前五道门</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['匹配分', '建议达到目标岗位门槛后再投'],
                ['事实核对', '简历中的数字、时间和职责真实可证'],
                ['关键词', '岗位高频词已自然写入简历'],
                ['材料版本', '简历、作品集、求职信版本一致'],
                ['人工提交', '本人登录平台确认并提交'],
              ].map(([title, desc], index) => (
                <div key={title} className="flex gap-3 rounded-xl border border-ink/10 bg-white/45 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest/10 text-xs font-bold text-forest">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-ink/50">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            {items.length === 0 ? (
              <Card className="text-center text-sm text-ink/45">
                <ClipboardList className="mx-auto h-8 w-8 text-ink/25" />
                <p className="mt-3">投递清单为空。先添加一个候选岗位。</p>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-bold text-ink">{item.company}</h3>
                        <Chip tone={item.matchScore >= 75 ? 'forest' : item.matchScore >= 60 ? 'gold' : 'accent'}>匹配 {item.matchScore}</Chip>
                        {item.matchScore < 60 && <AlertTriangle className="h-4 w-4 text-accent" />}
                      </div>
                      <p className="mt-1 text-sm text-ink/60">{item.role}</p>
                    </div>
                    <button onClick={() => persist(items.filter((entry) => entry.id !== item.id))} className="rounded-lg p-2 text-ink/35 hover:bg-accent/5 hover:text-accent" aria-label="删除">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.notes && <p className="mt-3 rounded-xl bg-ink/[0.025] p-3 text-xs leading-5 text-ink/55">{item.notes}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {STATUSES.map((status) => (
                      <button key={status} onClick={() => updateStatus(item.id, status)} className={`rounded-full px-2.5 py-1.5 text-xs transition ${item.status === status ? 'bg-accent text-paper' : 'bg-ink/5 text-ink/55 hover:text-ink'}`}>
                        {status}
                      </button>
                    ))}
                    {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline">打开岗位 <ArrowRight className="h-3.5 w-3.5" /></a>}
                  </div>
                  {item.status === '待人工投递' && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-forest">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 已通过分数门控，仍需本人完成最终提交。
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
