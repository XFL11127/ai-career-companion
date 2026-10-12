'use client';

/**
 * 信息中枢 · 证据展示组件
 *
 * 设计约束：标签不是数据字段，而是 deriveFriendlyLevel() 的计算结果。
 * 本组件只接收 evidence 列表并展示原文摘录 + 来源链接 + 抓取时间，绝不接受「是否友好」布尔值。
 */

import { AlertTriangle, ExternalLink, HelpCircle, Quote, ShieldCheck } from 'lucide-react';
import type { EvidenceItem, FriendlyLevel } from '@ai-career-companion/types';

const SIGNAL_LABEL: Record<string, string> = {
  degree_barrier: '学历门槛',
  school_list: '院校要求',
  bonus: '加分项',
  historical_admit: '历史录取',
  policy: '政策依据',
  deadline: '时间窗口',
};

const CREDIBILITY_TEXT: Record<string, string> = {
  A: 'A · 官方原文',
  B: 'B · 权威来源',
  C: 'C · 用户投稿',
};

const STATUS_TEXT: Record<string, string> = {
  approved: '已通过审核',
  pending: '待审核',
  rejected: '已驳回',
};

export function FriendlyBadge({ level }: { level: FriendlyLevel }) {
  if (level === 'verified') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-forest/10 px-1.5 py-0.5 text-[11px] font-medium text-forest">
        <ShieldCheck className="h-3 w-3" />
        双非友好 · 有据
      </span>
    );
  }
  if (level === 'reachable') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-gold/15 px-1.5 py-0.5 text-[11px] font-medium text-gold">
        <HelpCircle className="h-3 w-3" />
        门槛可及
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-ink/5 px-1.5 py-0.5 text-[11px] text-ink/45">
      未见依据
    </span>
  );
}

export function EvidenceCard({ item }: { item: EvidenceItem }) {
  const negative = item.direction === 'negative';
  return (
    <article
      className={`rounded-xl border p-3 ${
        negative ? 'border-red-200 bg-red-50/50' : 'border-ink/10 bg-ink/[0.02]'
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${
            negative ? 'bg-red-100 text-red-600' : 'bg-forest/10 text-forest'
          }`}
        >
          {SIGNAL_LABEL[item.signal] ?? item.signal}
        </span>
        <span className="rounded bg-ink/5 px-1.5 py-0.5 text-ink/50">
          {CREDIBILITY_TEXT[item.credibility] ?? item.credibility}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 ${
            item.status === 'approved' ? 'bg-forest/10 text-forest' : 'bg-gold/15 text-gold'
          }`}
        >
          {STATUS_TEXT[item.status] ?? item.status}
        </span>
        {negative && (
          <span className="inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-red-600">
            <AlertTriangle className="h-3 w-3" />
            限制性表述
          </span>
        )}
      </div>

      <blockquote className="relative rounded-lg bg-paper/70 p-2.5 pl-7 text-xs leading-relaxed text-ink/75">
        <Quote className="absolute left-2 top-2.5 h-3.5 w-3.5 text-accent/40" />
        {item.quote}
      </blockquote>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/45">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
        >
          查看来源原文
          <ExternalLink className="h-3 w-3" />
        </a>
        <span>{item.sourceSite}</span>
        {item.publishedAt && <span>· 发布 {item.publishedAt}</span>}
        <span>· 抓取 {item.fetchedAt.slice(0, 10)}</span>
        {item.reviewer && <span>· 审核人 {item.reviewer}</span>}
      </div>
    </article>
  );
}

export function EvidencePanel({
  evidence,
  title = '证据链',
  emptyHint = '这条信息还没有可核对的原文证据，因此不显示「双非友好」。可以点击「贡献这条」补充来源链接与原文摘录。',
}: {
  evidence: EvidenceItem[];
  title?: string;
  emptyHint?: string;
}) {
  const approved = evidence.filter((e) => e.status === 'approved');
  const pending = evidence.filter((e) => e.status === 'pending');

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-semibold text-ink/70">{title}</h3>
        <span className="text-[11px] text-ink/40">
          已核实 {approved.length} 条{pending.length > 0 ? ` · 待审核 ${pending.length} 条` : ''}
        </span>
      </div>

      {evidence.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink/15 p-3 text-[11px] leading-relaxed text-ink/45">
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-2">
          {evidence.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}