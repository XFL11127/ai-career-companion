'use client'

import { useMemo, useState } from 'react'
import { Brain, CheckCircle2, Compass, Info, Loader2, Sparkles } from 'lucide-react'
import { useSkill } from '@/lib/useSkill'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/skill-ui'
import { MemoryPanel } from '@/components/MemoryPanel'
import { BulletList, Chip, ProgressBar } from '@/components/feature-ui'

type Question = { id: string; group: string; text: string }

const QUESTIONS: Question[] = [
  { id: 'R1', group: '兴趣倾向', text: '我喜欢动手调试设备、工具或真实可见的物件。' },
  { id: 'R2', group: '兴趣倾向', text: '看到一个系统时，我更想拆开了解它怎么运转。' },
  { id: 'I1', group: '兴趣倾向', text: '我愿意为一个复杂问题查资料、做实验并验证猜想。' },
  { id: 'I2', group: '兴趣倾向', text: '比起现成答案，我更享受自己推理出结论。' },
  { id: 'A1', group: '兴趣倾向', text: '我喜欢用文字、视觉或产品原型表达新想法。' },
  { id: 'A2', group: '兴趣倾向', text: '自由度高的创作任务通常比标准流程更吸引我。' },
  { id: 'S1', group: '兴趣倾向', text: '帮助别人理解问题、获得进步会让我有成就感。' },
  { id: 'S2', group: '兴趣倾向', text: '我愿意主动协调团队中的分歧和情绪。' },
  { id: 'E1', group: '兴趣倾向', text: '我乐于推动一件事从想法走到落地。' },
  { id: 'E2', group: '兴趣倾向', text: '有明确目标时，我愿意承担组织和决策责任。' },
  { id: 'C1', group: '兴趣倾向', text: '我喜欢把信息整理成清晰、可复用的结构。' },
  { id: 'C2', group: '兴趣倾向', text: '按步骤检查和校准结果会让我感到踏实。' },
  { id: 'growth', group: '价值取向', text: '持续学习新东西比短期稳定更重要。' },
  { id: 'impact', group: '价值取向', text: '我希望自己的工作能对真实用户产生明显影响。' },
  { id: 'balance', group: '价值取向', text: '工作与生活的可预期性对我很重要。' },
  { id: 'autonomy', group: '工作方式', text: '我更喜欢拥有较大自主空间，而不是被细致安排。' },
  { id: 'collaboration', group: '工作方式', text: '通过频繁讨论和反馈推进任务，比独自摸索更适合我。' },
  { id: 'ambiguity', group: '工作方式', text: '面对信息不完整的新任务，我通常愿意先做出假设再验证。' },
]

const GROUPS = ['兴趣倾向', '价值取向', '工作方式']
const LIKERT = [
  [1, '很不符合'],
  [2, '不太符合'],
  [3, '一般'],
  [4, '比较符合'],
  [5, '非常符合'],
] as const

export default function AssessmentPage() {
  const { data, loading, error, run } = useSkill('assessment')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [targetRole, setTargetRole] = useState('')

  const answered = Object.keys(answers).length
  const complete = answered === QUESTIONS.length
  const grouped = useMemo(() => GROUPS.map((group) => ({ group, questions: QUESTIONS.filter((q) => q.group === group) })), [])

  const start = () => {
    if (!complete) return
    void run({ answers, targetRole: targetRole || undefined })
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">M5 · Self Discovery</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-ink">自我认知测评</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
            18 道探索题，覆盖兴趣、价值观和工作方式。结果用于缩小方向，不用于给自己贴标签。
          </p>
        </div>
        <div className="max-w-sm rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-5 text-[#7d5b17]">
          <Info className="mr-1 inline h-4 w-4" />
          本工具不是心理诊断，也不替代专业职业咨询。请以近期真实行为为依据作答。
        </div>
      </header>

      <MemoryPanel skill="assessment" />

      <Card className="mt-6">
        <label className="text-xs font-medium text-ink/55">
          可选：你目前最想验证的职业方向
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="例如：数据分析、产品经理、嵌入式开发"
            className="mt-2 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </Card>

      <div className="mt-5 space-y-5">
        {grouped.map(({ group, questions }) => (
          <Card key={group}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {group === '兴趣倾向' ? <Brain className="h-5 w-5 text-accent" /> : <Compass className="h-5 w-5 text-forest" />}
                <h2 className="font-serif text-lg font-bold text-ink">{group}</h2>
              </div>
              <Chip>{questions.filter((q) => answers[q.id]).length} / {questions.length}</Chip>
            </div>
            <div className="mt-4 space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-ink/10 bg-white/45 p-4">
                  <p className="text-sm font-medium leading-6 text-ink">
                    {index + 1}. {question.text}
                  </p>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {LIKERT.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        title={label}
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                        className={`rounded-xl border px-2 py-2 text-xs transition ${
                          answers[question.id] === value
                            ? 'border-accent bg-accent text-paper'
                            : 'border-ink/10 bg-paper text-ink/45 hover:border-accent/35 hover:text-accent'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-ink/35">
                    <span>很不符合</span><span>非常符合</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-4 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-paper/95 p-4 shadow-[0_20px_50px_-30px_rgba(31,27,22,.55)] backdrop-blur">
        <div>
          <p className="text-sm font-medium text-ink">已完成 {answered} / {QUESTIONS.length}</p>
          <p className="mt-0.5 text-xs text-ink/45">全部完成后生成探索画像与职业方向。</p>
        </div>
        <button
          onClick={start}
          disabled={!complete || loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? '正在生成画像…' : '生成我的职业探索画像'}
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && complete && <EmptyState label="作答已完成，点击下方按钮生成画像" />}
      {loading && !data && <LoadingState label="正在分析兴趣、价值观与工作方式…" />}

      {data && (
        <section className="mt-8 space-y-5">
          <Card className="bg-gradient-to-br from-white/85 to-forest/5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Exploration Profile</p>
                <h2 className="mt-2 font-serif text-3xl font-bold text-ink">{data.profileTitle}</h2>
                <p className="mt-2 text-sm text-ink/60">画像代码 {data.profileCode}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(data.traits ?? []).map((trait) => <Chip key={trait} tone="forest">{trait}</Chip>)}
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink/70">{data.reply}</p>
            <p className="mt-4 rounded-xl bg-gold/10 p-3 text-xs leading-5 text-[#7d5b17]">{data.disclaimer}</p>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">倾向维度</h3>
              <div className="mt-5 space-y-5">
                {(data.dimensions ?? []).map((dimension) => (
                  <ProgressBar key={dimension.key} label={`${dimension.name} · ${dimension.level}`} score={dimension.score} caption={dimension.description} />
                ))}
              </div>
            </Card>
            <div className="space-y-5">
              <Card>
                <h3 className="font-serif text-lg font-bold text-ink">优势</h3>
                <div className="mt-3"><BulletList items={data.strengths ?? []} /></div>
              </Card>
              <Card>
                <h3 className="font-serif text-lg font-bold text-ink">待验证假设</h3>
                <div className="mt-3"><BulletList items={data.growthAreas ?? []} /></div>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">推荐探索方向</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(data.recommendedCareers ?? []).map((career) => (
                <Card key={career.role} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-lg font-bold text-ink">{career.role}</h3>
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{career.fitScore}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/65">{career.reason}</p>
                  <div className="mt-auto pt-4">
                    <p className="flex items-start gap-1.5 text-xs leading-5 text-forest">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {career.nextStep}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">2-4 周验证计划</h3>
            <div className="mt-3"><BulletList items={data.actionPlan ?? []} ordered /></div>
          </Card>
        </section>
      )}
    </main>
  )
}
