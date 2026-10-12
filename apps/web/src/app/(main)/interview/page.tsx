'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Loader2, Mic2, Send, Sparkles, Target } from 'lucide-react'
import { useSkill } from '@/lib/useSkill'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/skill-ui'
import { MemoryPanel } from '@/components/MemoryPanel'
import { DocumentUpload } from '@/components/DocumentUpload'
import { BulletList, Chip, ProgressBar, ScoreRing } from '@/components/feature-ui'
import { RESUME_FILE_ACCEPT } from '@/lib/document'

type Mode = 'technical' | 'behavioral' | 'mixed'
type Language = 'zh' | 'en' | 'bilingual'

const MODE_LABELS: Record<Mode, string> = { technical: '技术面', behavioral: '行为面', mixed: '综合面' }
const LANGUAGE_LABELS: Record<Language, string> = { zh: '中文', en: '英文', bilingual: '中英双语' }

export default function InterviewPage() {
  const { data, loading, error, run } = useSkill('interview')
  const [targetRole, setTargetRole] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [mode, setMode] = useState<Mode>('mixed')
  const [language, setLanguage] = useState<Language>('zh')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [lastAction, setLastAction] = useState<'generate' | 'score'>('generate')

  const completedAnswers = useMemo(
    () =>
      (data?.questions ?? [])
        .map((q) => ({ question: q.question, answer: answers[q.id]?.trim() ?? '' }))
        .filter((item) => item.answer.length > 0),
    [answers, data?.questions]
  )

  const generate = () => {
    if (!targetRole.trim()) return
    setLastAction('generate')
    void run({ targetRole, resumeText: resumeText || undefined, jobDescription: jobDescription || undefined, mode, language })
  }

  const score = () => {
    if (!targetRole.trim() || completedAnswers.length === 0) return
    setLastAction('score')
    void run({
      targetRole,
      resumeText: resumeText || undefined,
      jobDescription: jobDescription || undefined,
      mode,
      language,
      priorAnswers: completedAnswers,
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">M2 · Interview Room</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">模拟面试舱</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
          上传简历与 JD，生成定向问题；先用 STAR 作答，再由独立评分卡检查表达结构。
        </p>
      </header>

      <MemoryPanel skill="interview" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Mic2 className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-lg font-bold text-ink">面试设置</h2>
          </div>
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="目标岗位，如「Java 后端开发（校招）」"
            className="mt-4 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent"
          />
          <div className="mt-4">
            <DocumentUpload
              accept={RESUME_FILE_ACCEPT}
              label="上传简历"
              hint="支持 PDF / DOCX，简历只用于生成本次问题"
              onExtract={(text) => setResumeText(text)}
              disabled={loading}
            />
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="或粘贴简历关键内容…"
            className="mt-3 h-28 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="粘贴目标岗位 JD（推荐）…"
            className="mt-3 h-28 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-ink/55">
              面试模式
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="mt-1.5 w-full rounded-xl border border-ink/15 bg-paper p-2.5 text-sm text-ink outline-none focus:border-accent">
                {(Object.keys(MODE_LABELS) as Mode[]).map((item) => <option key={item} value={item}>{MODE_LABELS[item]}</option>)}
              </select>
            </label>
            <label className="text-xs text-ink/55">
              出题语言
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="mt-1.5 w-full rounded-xl border border-ink/15 bg-paper p-2.5 text-sm text-ink outline-none focus:border-accent">
                {(Object.keys(LANGUAGE_LABELS) as Language[]).map((item) => <option key={item} value={item}>{LANGUAGE_LABELS[item]}</option>)}
              </select>
            </label>
          </div>
          <button
            onClick={generate}
            disabled={loading || !targetRole.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? '面试官准备中…' : '生成本轮面试'}
          </button>
        </Card>

        <Card className="bg-gradient-to-br from-white/80 to-forest/5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-forest" />
            <h2 className="font-serif text-lg font-bold text-ink">评分维度</h2>
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['清晰度', '观点是否先结论、少绕弯'],
              ['结构', '是否遵循 STAR/总分总'],
              ['相关性', '是否回应问题与岗位要求'],
              ['深度', '是否有技术细节、权衡和复盘'],
            ].map(([label, desc]) => (
              <div key={label}>
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="mt-1 text-xs text-ink/50">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-gold/10 p-3 text-xs leading-5 text-[#8f6515]">
            建议先把 2-3 题答完再评分。评分不是能力标签，而是下一轮练习的定位工具。
          </p>
        </Card>
      </div>

      {error && <ErrorState message={error} onRetry={lastAction === 'score' ? score : generate} />}
      {!error && !data && !loading && <EmptyState label="填写目标岗位，生成第一轮定向面试题" />}
      {loading && !data && <LoadingState label="面试官正在结合简历与 JD 出题…" />}

      {data && (
        <section className="mt-8 space-y-5">
          {data.scoreCard && (
            <Card>
              <div className="flex flex-wrap items-center gap-8">
                <ScoreRing score={data.scoreCard.overall} label="本轮总分" tone="forest" />
                <div className="min-w-[260px] flex-1 space-y-4">
                  <ProgressBar label="清晰度" score={data.scoreCard.clarity} />
                  <ProgressBar label="结构" score={data.scoreCard.structure} />
                  <ProgressBar label="相关性" score={data.scoreCard.relevance} />
                  <ProgressBar label="深度" score={data.scoreCard.depth} />
                </div>
                <p className="max-w-md text-sm leading-6 text-ink/65">{data.scoreCard.feedback}</p>
              </div>
            </Card>
          )}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">本轮问题</h2>
              <p className="mt-1 text-sm text-ink/55">{data.reply || '按 STAR 结构逐个作答，完成后可提交评分。'}</p>
            </div>
            <Chip tone="gold">{MODE_LABELS[mode]} · {LANGUAGE_LABELS[language]}</Chip>
          </div>

          <div className="space-y-4">
            {(data.questions ?? []).map((question, index) => (
              <Card key={question.id || index}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-paper">{index + 1}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip tone="accent">{question.category}</Chip>
                        <span className="text-xs text-ink/40">考察：{question.intention}</span>
                      </div>
                      <h3 className="mt-2 font-serif text-lg font-bold leading-7 text-ink">{question.question}</h3>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gold/20 bg-gold/5 p-3 text-xs leading-5 text-[#7d5b17]">
                  STAR 提示：{question.starHint}
                </div>

                <textarea
                  value={answers[question.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                  placeholder="先写关键词也可以：背景 / 任务 / 行动 / 结果 / 复盘…"
                  className="mt-3 h-28 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
                />

                <details className="mt-3 rounded-xl border border-ink/10 bg-white/45 p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink/75">
                    查看参考答题框架
                    <ChevronDown className="h-4 w-4" />
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-ink/65">{question.sampleAnswer}</p>
                </details>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">可能的追问</h3>
              <div className="mt-3"><BulletList items={data.followUps ?? []} /></div>
            </Card>
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">下一轮训练计划</h3>
              <div className="mt-3"><BulletList items={data.improvementPlan ?? []} ordered /></div>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/15 bg-accent/5 p-4">
            <p className="text-sm text-ink/65">
              已完成 {completedAnswers.length} / {data.questions?.length ?? 0} 题。建议至少完成 2 题后评分。
            </p>
            <button
              onClick={score}
              disabled={loading || completedAnswers.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-forest/90 disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              提交回答并评分
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
