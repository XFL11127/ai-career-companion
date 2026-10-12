'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Target } from 'lucide-react'
import { useSkill } from '@/lib/useSkill'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/skill-ui'
import { MemoryPanel } from '@/components/MemoryPanel'
import { DocumentUpload } from '@/components/DocumentUpload'
import { BulletList, Chip, ProgressBar, ScoreRing } from '@/components/feature-ui'
import { RESUME_FILE_ACCEPT } from '@/lib/document'

const RECOMMENDATION = {
  recommend: { label: '建议投递', tone: 'text-forest bg-forest/10 border-forest/20', icon: CheckCircle2 },
  caution: { label: '补齐后再投', tone: 'text-[#9a6b12] bg-gold/10 border-gold/25', icon: AlertTriangle },
  avoid: { label: '暂不建议', tone: 'text-accent bg-accent/10 border-accent/20', icon: ShieldCheck },
} as const

export default function MatchPage() {
  const { data, loading, error, run } = useSkill('match')
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [targetLocation, setTargetLocation] = useState('')
  const [targetIndustry, setTargetIndustry] = useState('')
  const [careerGoal, setCareerGoal] = useState('')

  const start = () => {
    if (!resumeText.trim() || !jobDescription.trim()) return
    void run({
      resumeText,
      jobDescription,
      targetLocation: targetLocation || undefined,
      targetIndustry: targetIndustry || undefined,
      careerGoal: careerGoal || undefined,
    })
  }

  const recommendation = RECOMMENDATION[data?.recommendation ?? 'caution']
  const RecommendationIcon = recommendation.icon

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">M3 · Match Radar</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-ink">岗位匹配雷达</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
            技能、经验、地域、行业、职业轨迹五维评分。默认建议不盲投，只有证据充分时才允许进入投递流程。
          </p>
        </div>
        <div className="rounded-2xl border border-forest/20 bg-forest/5 px-4 py-3 text-xs leading-5 text-forest">
          <ShieldCheck className="mr-1 inline h-4 w-4" />
          人工投递门控已启用
        </div>
      </header>

      <MemoryPanel skill="match" />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-lg font-bold text-ink">候选人材料</h2>
          </div>
          <div className="mt-4">
            <DocumentUpload accept={RESUME_FILE_ACCEPT} label="上传简历" onExtract={(text) => setResumeText(text)} disabled={loading} />
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="粘贴简历文本…"
            className="mt-3 h-44 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-forest" />
            <h2 className="font-serif text-lg font-bold text-ink">目标岗位</h2>
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="粘贴完整岗位 JD…"
            className="mt-4 h-44 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="期望地点" className="rounded-xl border border-ink/15 bg-paper p-2.5 text-sm outline-none focus:border-accent" />
            <input value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} placeholder="期望行业" className="rounded-xl border border-ink/15 bg-paper p-2.5 text-sm outline-none focus:border-accent" />
            <input value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} placeholder="职业目标" className="rounded-xl border border-ink/15 bg-paper p-2.5 text-sm outline-none focus:border-accent" />
          </div>
          <button
            onClick={start}
            disabled={loading || !resumeText.trim() || !jobDescription.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            {loading ? '计算匹配中…' : '生成匹配报告'}
          </button>
        </Card>
      </div>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="导入简历与 JD，生成五维匹配报告" />}
      {loading && !data && <LoadingState label="正在计算五维匹配度…" />}

      {data && (
        <section className="mt-8 space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-8">
              <ScoreRing score={data.overallScore ?? 0} label="综合匹配度" tone={data.recommendation === 'recommend' ? 'forest' : data.recommendation === 'avoid' ? 'accent' : 'gold'} />
              <div className="min-w-[260px] flex-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${recommendation.tone}`}>
                  <RecommendationIcon className="h-4 w-4" /> {recommendation.label}
                </span>
                <h2 className="mt-3 font-serif text-xl font-bold leading-8 text-ink">{data.summary}</h2>
              </div>
              <div className="max-w-xs rounded-xl bg-ink/[0.03] p-3 text-xs leading-5 text-ink/55">
                投递权仍归用户。系统不会登录平台、自动填写或批量提交申请。
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">五维评分</h3>
              <div className="mt-5 space-y-5">
                {(data.dimensions ?? []).map((dimension) => (
                  <ProgressBar
                    key={dimension.key}
                    label={`${dimension.name} · 权重 ${dimension.weight}%`}
                    score={dimension.score}
                    caption={dimension.reason}
                  />
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">直接优势</h3>
              <div className="mt-3"><BulletList items={data.strengths ?? []} /></div>
              <h3 className="mt-5 font-serif text-lg font-bold text-ink">缺失关键词</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.missingKeywords ?? []).map((keyword, index) => <Chip key={`${keyword}-${index}`} tone="accent">{keyword}</Chip>)}
              </div>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-gold/20 bg-gold/5">
              <h3 className="font-serif text-lg font-bold text-ink">风险与不确定性</h3>
              <div className="mt-3"><BulletList items={data.risks ?? []} /></div>
            </Card>
            <Card className="border-forest/20 bg-forest/5">
              <h3 className="font-serif text-lg font-bold text-ink">投递前行动</h3>
              <div className="mt-3"><BulletList items={data.actions ?? []} ordered /></div>
            </Card>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link href="/resume" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2.5 text-sm text-ink transition hover:border-accent">
              去补齐简历关键词 <ArrowRight className="h-4 w-4" />
            </Link>
            {data.recommendation === 'recommend' && (
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm text-paper transition hover:bg-forest/90">
                进入人工投递清单 <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
