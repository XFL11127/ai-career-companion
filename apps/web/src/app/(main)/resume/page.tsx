'use client'

import { useState } from 'react'
import { Check, Copy, Download, FileDown, FileText, Loader2, Printer, Sparkles } from 'lucide-react'
import { useSkill } from '@/lib/useSkill'
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/skill-ui'
import { MemoryPanel } from '@/components/MemoryPanel'
import { DocumentUpload } from '@/components/DocumentUpload'
import { BulletList, Chip, ProgressBar, ScoreRing } from '@/components/feature-ui'
import { RESUME_FILE_ACCEPT } from '@/lib/document'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ResumePage() {
  const { data, loading, error, run } = useSkill('resume')
  const [resumeText, setResumeText] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const start = () => {
    if (!resumeText.trim() || !targetRole.trim()) return
    void run({ resumeText, targetRole, jobDescription: jobDescription || undefined })
  }

  const copyResume = async () => {
    if (!data?.optimizedResume) return
    await navigator.clipboard.writeText(data.optimizedResume)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const printPdf = () => {
    if (!data?.optimizedResume) return
    const win = window.open('', '_blank')
    if (!win) return
    win.opener = null
    const escaped = data.optimizedResume
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    win.document.write(`<!doctype html><html><head><title>优化简历</title><style>body{max-width:780px;margin:48px auto;font-family:"Microsoft YaHei",sans-serif;line-height:1.75;color:#1f1b16;white-space:pre-wrap}h1{font-size:22px}@page{margin:18mm}</style></head><body><h1>优化简历</h1>${escaped}</body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  const exportDocx = async () => {
    if (!data?.optimizedResume) return
    setExporting(true)
    try {
      const { Document, Packer, Paragraph, TextRun } = await import('docx')
      const children = data.optimizedResume.split('\n').map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, size: 22, font: 'Microsoft YaHei' })],
            spacing: { after: 100 },
          })
      )
      const doc = new Document({ sections: [{ children }] })
      downloadBlob(await Packer.toBlob(doc), `优化简历_${targetRole || '目标岗位'}.docx`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">M1 · Resume Studio</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-ink">智能简历工坊</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
            解析 → 关键词重写 → 要点精修 → ATS 评分。优先本地解析文件，不上传原始简历。
          </p>
        </div>
        <div className="rounded-2xl border border-forest/20 bg-forest/5 px-4 py-3 text-xs leading-5 text-forest">
          人工门控：AI 只提供改写建议<br />所有虚构风险项需你本人确认
        </div>
      </header>

      <MemoryPanel skill="resume" />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <Card>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <h2 className="font-serif text-lg font-bold text-ink">1. 导入简历与目标岗位</h2>
          </div>
          <div className="mt-4">
            <DocumentUpload
              accept={RESUME_FILE_ACCEPT}
              label="上传简历"
              hint="支持 PDF / DOCX；旧版 DOC 请先另存为 DOCX"
              onExtract={(text) => setResumeText(text)}
              disabled={loading}
            />
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="也可以直接粘贴简历全文，保留原始事实与数字…"
            className="mt-3 h-40 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="目标岗位，如「前端开发工程师（校招）」"
            className="mt-3 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="可选：粘贴岗位 JD，ATS 评分会更准确"
            className="mt-3 h-28 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm leading-6 outline-none focus:border-accent"
          />
          <button
            onClick={start}
            disabled={loading || !resumeText.trim() || !targetRole.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? '四步诊断中…' : '开始优化与评分'}
          </button>
        </Card>

        <Card className="bg-gradient-to-br from-white/75 to-gold/5">
          <h2 className="font-serif text-lg font-bold text-ink">评分逻辑</h2>
          <div className="mt-4 space-y-5">
            {[
              ['关键词覆盖', '目标岗位高频词、技能和证书是否出现'],
              ['成果量化', '项目是否包含角色、规模、指标与结果'],
              ['结构可读性', 'ATS 是否容易按顺序解析教育和经历'],
              ['岗位相关性', '经历叙事是否服务于目标岗位'],
            ].map(([title, desc], index) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{index + 1}</span>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink/50">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="导入简历并填写目标岗位，开始生成 ATS 报告" />}
      {loading && !data && <LoadingState label="正在解析简历并计算 ATS 分数…" />}

      {data && (
        <section className="mt-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">诊断报告</h2>
              <p className="mt-1 text-sm text-ink/55">{data.reply || '已基于当前事实生成改简历建议。'}</p>
            </div>
            {data.optimizedResume && (
              <div className="flex flex-wrap gap-2">
                <button onClick={copyResume} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-2 text-xs hover:border-accent">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? '已复制' : '复制优化稿'}
                </button>
                <button onClick={printPdf} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-2 text-xs hover:border-accent">
                  <Printer className="h-3.5 w-3.5" /> 打印 / 导出 PDF
                </button>
                <button onClick={exportDocx} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3 py-2 text-xs text-paper disabled:opacity-50">
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} 导出 DOCX
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card className="flex items-center justify-around md:col-span-2">
              <ScoreRing score={data.overallScore ?? 0} label="综合竞争力" />
              <ScoreRing score={data.atsScore ?? 0} label="ATS 可解析度" tone="forest" />
              <div className="max-w-[220px]">
                <p className="text-xs font-medium text-ink/45">缺失关键词</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(data.missingKeywords ?? []).map((keyword, index) => <Chip key={`${keyword}-${index}`} tone="accent">{keyword}</Chip>)}
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">当前优势</h3>
              <div className="mt-3"><BulletList items={data.strengths ?? []} /></div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">四维评分</h3>
              <div className="mt-5 space-y-5">
                {(data.dimensions ?? []).map((item) => (
                  <ProgressBar key={item.name} label={item.name} score={item.score} caption={item.comment} />
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">下一步动作</h3>
              <div className="mt-4"><BulletList items={data.nextActions ?? []} ordered /></div>
            </Card>
          </div>

          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">改写建议</h3>
            <div className="mt-4 space-y-4">
              {(data.rewriteSuggestions ?? []).map((item, index) => (
                <article key={`${item.section}-${index}`} className="rounded-2xl border border-ink/10 bg-white/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{item.section}</span>
                    <Chip tone="gold">建议改写</Chip>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-accent/5 p-3">
                      <p className="text-xs font-medium text-accent">原表达</p>
                      <p className="mt-1.5 text-sm leading-6 text-ink/65">{item.before}</p>
                    </div>
                    <div className="rounded-xl bg-forest/5 p-3">
                      <p className="text-xs font-medium text-forest">建议表达</p>
                      <p className="mt-1.5 text-sm leading-6 text-ink/75">{item.after}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-ink/50">{item.reason}</p>
                </article>
              ))}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-ink">优化后简历</h3>
                <Download className="h-4 w-4 text-ink/35" />
              </div>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-ink/75">{data.optimizedResume}</pre>
            </Card>
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">量化项目要点</h3>
              <div className="mt-4"><BulletList items={data.projectBullets ?? []} /></div>
            </Card>
          </div>
        </section>
      )}
    </main>
  )
}
