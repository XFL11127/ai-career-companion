'use client';

import { ExternalLink, Plus, ShieldCheck } from 'lucide-react';
import { panelCls } from '@/components/skill-ui';

export interface SourceCardProps {
  title: string;
  url: string;
  summary: string;
  sourceSite?: string;
  datePublished?: string;
  /** 系统资源库受保护条目 */
  protectedItem?: boolean;
  /** 点击「贡献这条信息」回调（可选，出现时作为第 2 个按钮） */
  onContribute?: () => void;
  /** 是否标注「示例」（demo stub 检索结果） */
  demo?: boolean;
}

/**
 * 来源卡片（§4.2）：标题 + 链接 + 摘要 + 来源站点 + 发布时间。
 * 遵循微软 Copilot UX 规范：单卡片操作按钮 ≤2（打开原文 / 贡献），渐进披露，状态显式。
 */
export function SourceCard({
  title,
  url,
  summary,
  sourceSite,
  datePublished,
  protectedItem,
  onContribute,
  demo,
}: SourceCardProps) {
  const site =
    sourceSite ??
    (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();

  return (
    <article className={`${panelCls} p-4 shadow-[0_14px_34px_-26px_rgba(31,27,22,0.4)]`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-ink">{title}</h3>
        {protectedItem && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-ink/50">
            <ShieldCheck className="h-3 w-3" />
            受保护
          </span>
        )}
      </div>

      {site && (
        <div className="mt-1 flex items-center gap-2 text-xs text-ink/45">
          <span>{site}</span>
          {datePublished && (
            <>
              <span className="text-ink/20">·</span>
              <span>{datePublished}</span>
            </>
          )}
          {demo && (
            <>
              <span className="text-ink/20">·</span>
              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                示例
              </span>
            </>
          )}
        </div>
      )}

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/70">{summary}</p>

      <div className="mt-3 flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-paper transition hover:bg-[#c94a23]"
        >
          打开原文
          <ExternalLink className="h-3 w-3" />
        </a>
        {onContribute && (
          <button
            type="button"
            onClick={onContribute}
            className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1 text-xs text-ink/60 transition hover:border-accent/40 hover:text-accent"
          >
            <Plus className="h-3 w-3" />
            贡献这条
          </button>
        )}
      </div>
    </article>
  );
}
