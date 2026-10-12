'use client'

import { useState } from 'react'
import { BookOpen, BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCw, Sparkles } from 'lucide-react'
import { useSkill } from '@/lib/useSkill'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/skill-ui'
import { MemoryPanel } from '@/components/MemoryPanel'
import { DocumentUpload } from '@/components/DocumentUpload'
import { BulletList, Chip } from '@/components/feature-ui'
import { COURSE_FILE_ACCEPT } from '@/lib/document'

type Level = 'beginner' | 'intermediate' | 'advanced'
const LEVEL_LABELS: Record<Level, string> = { beginner: '入门', intermediate: '进阶', advanced: '深入' }

export default function CoursePage() {
  const { data, loading, error, run } = useSkill('course')
  const [materialText, setMaterialText] = useState('')
  const [materialName, setMaterialName] = useState('')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<Level>('beginner')
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const [cardIndex, setCardIndex] = useState(0)
  const [quizPicks, setQuizPicks] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const flashcards = data?.flashcards ?? []
  const currentCard = flashcards[Math.min(cardIndex, Math.max(0, flashcards.length - 1))]

  const start = () => {
    if (!materialText.trim()) return
    setFlipped(new Set())
    setCardIndex(0)
    setQuizPicks({})
    setRevealed(new Set())
    void run({ materialText, materialName: materialName || undefined, goal: goal || undefined, level })
  }

  const toggleCard = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAnswer = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">M4 · Study Companion</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">课程学习助手</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
          上传 PDF / DOCX / PPTX，自动抽取概念、生成抽认卡、小测与多日学习计划。文件解析在浏览器本地完成。
        </p>
      </header>

      <MemoryPanel skill="course" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-lg font-bold text-ink">导入学习资料</h2>
          </div>
          <div className="mt-4">
            <DocumentUpload
              accept={COURSE_FILE_ACCEPT}
              label="上传资料"
              hint="支持 PDF / DOCX / PPTX / TXT / Markdown"
              onExtract={(text, file) => {
                setMaterialText(text)
                setMaterialName(file.name)
              }}
              disabled={loading}
            />
          </div>
          <textarea
            value={materialText}
            onChange={(e) => setMaterialText(e.target.value)}
            placeholder="或直接粘贴讲义、教材章节、课程笔记…"
            className="mt-3 h-52 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-forest" />
            <h2 className="font-serif text-lg font-bold text-ink">学习目标</h2>
          </div>
          <input
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            placeholder="资料名称（可选）"
            className="mt-4 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent"
          />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="例如：3 天后能独立完成这一章的编程题"
            className="mt-3 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent"
          />
          <label className="mt-3 block text-xs text-ink/55">
            当前水平
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="mt-1.5 w-full rounded-xl border border-ink/15 bg-paper p-2.5 text-sm text-ink outline-none focus:border-accent">
              {(Object.keys(LEVEL_LABELS) as Level[]).map((item) => <option key={item} value={item}>{LEVEL_LABELS[item]}</option>)}
            </select>
          </label>
          <button
            onClick={start}
            disabled={loading || !materialText.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? '正在构建知识包…' : '生成学习包'}
          </button>
        </Card>
      </div>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="上传或粘贴课程资料，生成概念、卡片、小测与计划" />}
      {loading && !data && <LoadingState label="正在提取概念并设计复习节奏…" />}

      {data && (
        <section className="mt-8 space-y-5">
          <Card className="bg-gradient-to-br from-white/80 to-gold/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <h2 className="font-serif text-2xl font-bold text-ink">知识总览</h2>
                <p className="mt-3 text-sm leading-7 text-ink/70">{data.summary}</p>
              </div>
              <Chip tone="gold">{LEVEL_LABELS[level]}</Chip>
            </div>
          </Card>

          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">主动回忆卡</h2>
            <p className="mt-1 text-sm text-ink/55">先自己回答，再翻面核对。当前 {Math.min(cardIndex + 1, flashcards.length)} / {flashcards.length}</p>
            {currentCard && (
              <div className="mt-4">
                <button
                  onClick={() => toggleCard(currentCard.id)}
                  className="min-h-56 w-full rounded-3xl border border-accent/20 bg-white/70 p-8 text-left shadow-[0_20px_50px_-32px_rgba(31,27,22,.55)] transition hover:-translate-y-1 hover:border-accent/45"
                >
                  <div className="flex items-center justify-between">
                    <Chip tone="accent">{flipped.has(currentCard.id) ? '答案' : '问题'}</Chip>
                    <RotateCw className="h-4 w-4 text-ink/35" />
                  </div>
                  <p className="mt-8 font-serif text-xl font-bold leading-9 text-ink">
                    {flipped.has(currentCard.id) ? currentCard.back : currentCard.front}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {(currentCard.tags ?? []).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={() => setCardIndex((index) => Math.max(0, index - 1))} disabled={cardIndex === 0} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-2 text-xs disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" />上一张</button>
                  <button onClick={() => toggleCard(currentCard.id)} className="rounded-full bg-accent px-4 py-2 text-xs text-paper">翻面</button>
                  <button onClick={() => setCardIndex((index) => Math.min(flashcards.length - 1, index + 1))} disabled={cardIndex >= flashcards.length - 1} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-2 text-xs disabled:opacity-30">下一张<ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">关键概念</h3>
              <div className="mt-4 space-y-4">
                {(data.concepts ?? []).map((concept, index) => (
                  <article key={`${concept.term}-${index}`} className="rounded-2xl border border-ink/10 bg-white/45 p-4">
                    <h4 className="font-medium text-ink">{index + 1}. {concept.term}</h4>
                    <p className="mt-2 text-sm leading-6 text-ink/70">{concept.explanation}</p>
                    <p className="mt-2 text-xs leading-5 text-ink/50">例子：{concept.example}</p>
                    <p className="mt-2 text-xs leading-5 text-forest">为什么重要：{concept.whyItMatters}</p>
                  </article>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">常见误区</h3>
              <div className="mt-3"><BulletList items={data.misconceptions ?? []} /></div>
              <h3 className="mt-6 font-serif text-lg font-bold text-ink">学习计划</h3>
              <div className="mt-3 space-y-3">
                {(data.studyPlan ?? []).map((plan) => (
                  <div key={plan.dayRange} className="rounded-2xl border border-ink/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{plan.dayRange}</span>
                      <Chip tone="forest">{plan.goal}</Chip>
                    </div>
                    <div className="mt-3"><BulletList items={plan.tasks ?? []} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">章节小测</h3>
            <div className="mt-4 space-y-4">
              {(data.quiz ?? []).map((question, index) => (
                <article key={question.id || index} className="rounded-2xl border border-ink/10 bg-white/45 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium leading-6 text-ink">{question.question}</p>
                      {question.type === 'single' ? (
                        <div className="mt-3 space-y-2">
                          {(question.options ?? []).map((option) => (
                            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-sm text-ink/70 hover:border-accent/30">
                              <input type="radio" name={question.id} checked={quizPicks[question.id] === option} onChange={() => setQuizPicks((prev) => ({ ...prev, [question.id]: option }))} />
                              {option}
                            </label>
                          ))}
                        </div>
                      ) : null}
                      <button onClick={() => toggleAnswer(question.id)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {revealed.has(question.id) ? '收起答案' : '查看答案'}
                      </button>
                      {revealed.has(question.id) && (
                        <div className={`mt-3 rounded-xl p-3 text-sm leading-6 ${quizPicks[question.id] === question.answer ? 'bg-forest/10 text-forest' : 'bg-gold/10 text-[#7d5b17]'}`}>
                          <p><strong>答案：</strong>{question.answer}</p>
                          <p className="mt-1"><strong>解析：</strong>{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </section>
      )}
    </main>
  )
}
