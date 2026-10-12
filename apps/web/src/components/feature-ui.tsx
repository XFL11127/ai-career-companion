'use client'

import type { ReactNode } from 'react'

export function ScoreRing({
  score,
  label,
  size = 116,
  tone = 'accent',
}: {
  score: number
  label: string
  size?: number
  tone?: 'accent' | 'forest' | 'gold'
}) {
  const color = tone === 'forest' ? '#2E5E47' : tone === 'gold' ? '#E0A83E' : '#E0592E'
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${color} ${safe * 3.6}deg, rgba(31,27,22,.08) 0deg)`,
        }}
      >
        <div className="flex h-[78%] w-[78%] flex-col items-center justify-center rounded-full bg-paper">
          <strong className="font-serif text-2xl text-ink">{safe}</strong>
          <span className="text-[10px] text-ink/45">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-medium text-ink/60">{label}</span>
    </div>
  )
}

export function ProgressBar({
  label,
  score,
  caption,
}: {
  label: string
  score: number
  caption?: string
}) {
  const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
  const tone = safe >= 80 ? 'bg-forest' : safe >= 60 ? 'bg-gold' : 'bg-accent'
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink/50">{safe}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${safe}%` }} />
      </div>
      {caption && <p className="mt-1.5 text-xs leading-5 text-ink/55">{caption}</p>}
    </div>
  )
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'forest' | 'gold'
}) {
  const styles = {
    default: 'border-ink/10 bg-ink/5 text-ink/65',
    accent: 'border-accent/20 bg-accent/10 text-accent',
    forest: 'border-forest/20 bg-forest/10 text-forest',
    gold: 'border-gold/25 bg-gold/10 text-[#9a6b12]',
  }[tone]
  return <span className={`rounded-full border px-2.5 py-1 text-xs ${styles}`}>{children}</span>
}

export function BulletList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={`space-y-2 pl-5 text-sm leading-6 text-ink/70 ${ordered ? 'list-decimal' : 'list-disc'}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </Tag>
  )
}
