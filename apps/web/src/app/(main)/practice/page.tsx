'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSkill } from '@/lib/useSkill'
import { ArrowRight, PartyPopper } from 'lucide-react'
import { saveUserProfile } from '@/lib/memory'
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/skill-ui'
import { MemoryPanel } from '@/components/MemoryPanel'

type Mode = 'interview' | 'algorithm' | 'project'

export default function PracticePage() {
  const { data, loading, error, run } = useSkill('practice')
  const [mode, setMode] = useState<Mode>('interview')
  const [topic, setTopic] = useState('')
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-practice-shown')) {
        setShowBadge(true)
        localStorage.setItem('badge-practice-shown', 'true')
      }
      const modeLabel: Record<Mode, string> = { interview: '模拟面试', algorithm: '算法刷题', project: '项目实战' }
      const summary = topic
        ? `${modeLabel[mode]}练习：${topic}`
        : `${modeLabel[mode]}练习`
      saveUserProfile(summary)
    }
  }, [data])

  const start = () => run({ mode, topic: topic || undefined })
  const modeLabel: Record<Mode, string> = { interview: '模拟面试', algorithm: '算法刷题', project: '项目实战' }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">实战练兵</h1>
      <p className="mt-2 text-ink/60">模拟面试 / 算法刷题 / 项目实战，边练边纠偏</p>
      <MemoryPanel skill="practice" />

      {showBadge && data && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="mr-1.5 inline h-5 w-5 align-[-2px]" />实战练兵达成！每次练习都是进步
        </div>
      )}

      <Card className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(modeLabel) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                mode === m ? 'bg-accent text-paper' : 'border border-ink/15 text-ink/60 hover:border-ink/40'
              }`}
            >
              {modeLabel[m]}
            </button>
          ))}
        </div>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="可选：指定主题，如「React 性能优化」"
          className="w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={start}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '生成中…' : '开始练兵'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="选择模式，生成针对性问题与纠偏反馈" />}
      {loading && !data && <LoadingState label="正在准备题目…" />}

      {data && (
        <div className="mt-6 space-y-4">
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">问题</h3>
            <ul className="mt-3 list-decimal space-y-2 pl-5 text-ink/80">
              {data.questions?.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Card>
          {data.feedback && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">纠偏反馈</h3>
              <p className="mt-3 text-ink/70">{data.feedback}</p>
            </Card>
          )}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <Link href="/info" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600">
            填补信息差 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </main>
  )
}
