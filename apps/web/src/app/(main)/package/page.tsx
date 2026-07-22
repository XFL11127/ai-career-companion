'use client'
import { useState } from 'react'
import { useSkill } from '@/lib/useSkill'
import { Card, LoadingState, ErrorState, EmptyState } from '@/components/skill-ui'

export default function PackagePage() {
  const { data, loading, error, run } = useSkill('package')
  const [resumeText, setResumeText] = useState('')
  const [targetRole, setTargetRole] = useState('')

  const start = () =>
    run({
      resumeText: resumeText || '（示例）双非大三，做过课程项目，无实习经历，熟悉 HTML/CSS/JS',
      targetRole: targetRole || '前端开发工程师',
    })

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-3xl font-bold text-ink">成果包装</h1>
      <p className="mt-2 text-ink/60">简历优化 / 项目润色 / 面试复盘，把经历讲成故事</p>

      <Card className="mt-6 space-y-3">
        <input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="目标岗位，如「前端开发工程师」"
          className="w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="粘贴你的简历原文…"
          className="h-32 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={start}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '包装中…' : '开始包装'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="填入简历与目标岗位，生成优化版本" />}
      {loading && !data && <LoadingState label="正在包装成果…" />}

      {data && (
        <div className="mt-6 space-y-4">
          {data.optimizedResume && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">优化简历</h3>
              <p className="mt-3 whitespace-pre-wrap text-ink/80">{data.optimizedResume}</p>
            </Card>
          )}
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">项目量化亮点</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
              {data.projectBullets?.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </Card>
          {data.interviewReview && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">面试复盘</h3>
              <p className="mt-3 text-ink/70">{data.interviewReview}</p>
            </Card>
          )}
        </div>
      )}
    </main>
  )
}
