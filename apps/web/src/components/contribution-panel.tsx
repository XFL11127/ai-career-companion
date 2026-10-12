'use client';

/**
 * 用户贡献（UC-B5）：提交表单 + 贡献列表 + 审核动作。
 *
 * 权限（2026-09-25 起）：审核按钮的可见性由**真实登录会话**决定
 * （useSession 的 role ∈ teacher/admin），服务端还会再校验一次；
 * 客户端的本机角色切换不再授予审核权限。
 *
 * 审核规则（与数据库层一致）：
 * - 通过审核必须选择可信度（A 官方原文 / B 权威来源 / C 用户投稿），并给贡献者记分；
 * - 没有原文摘录的贡献无法通过，只能「驳回」或「待补充证据」。
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { panelCls } from '@/components/skill-ui';
import { AlertTriangle, Check, Inbox, LogIn, RotateCcw, X } from 'lucide-react';
import { loadContributions, type InfoItem } from '@/lib/infobase';
import { submitReview } from '@/lib/hub-review-client';
import { ContributionForm } from '@/components/contribution-form';

const STATUS_LABEL: Record<InfoItem['status'], { text: string; cls: string }> = {
  pending: { text: '待审核', cls: 'bg-gold/15 text-gold' },
  needs_info: { text: '待补充证据', cls: 'bg-gold/15 text-gold' },
  published: { text: '已通过', cls: 'bg-forest/15 text-forest' },
  rejected: { text: '已驳回', cls: 'bg-red-100 text-red-500' },
};

const CREDIBILITY_OPTIONS = [
  { value: 'A' as const, label: 'A · 官方原文' },
  { value: 'B' as const, label: 'B · 权威来源' },
  { value: 'C' as const, label: 'C · 用户投稿' },
];

export function ContributionPanel({ onChanged }: { onChanged?: () => void }) {
  const { data: session, status: sessionStatus } = useSession();
  const [list, setList] = useState<InfoItem[]>([]);
  const [credibility, setCredibility] = useState<'A' | 'B' | 'C'>('C');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busyId, setBusyId] = useState('');

  const refresh = useCallback(() => {
    setList(loadContributions());
    onChanged?.();
  }, [onChanged]);

  useEffect(() => {
    setList(loadContributions());
  }, []);

  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  const signedIn = sessionStatus === 'authenticated';
  const reviewer = signedIn && (sessionRole === 'teacher' || sessionRole === 'admin');

  async function decide(item: InfoItem, decision: InfoItem['status']) {
    setBusyId(item.id);
    const result = await submitReview({
      id: item.id,
      status: decision,
      credibility,
      ownerId: item.ownerId,
      localReviewer: session?.user?.name ?? '本机审核',
    });
    setBusyId('');

    if (result.ok) {
      const via = result.via === 'cloud' ? '云端' : '本机';
      setNotice({
        kind: 'ok',
        text:
          decision === 'published'
            ? `${via}通过（${credibility} 级，贡献者 +${result.points ?? 0} 积分）`
            : `${via}标记为${STATUS_LABEL[decision].text}`,
      });
    } else {
      setNotice({ kind: 'err', text: result.error ?? '审核失败' });
    }
    refresh();
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={`${panelCls} p-5`}>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">提交贡献</h2>
        <ContributionForm onSubmitted={refresh} />
      </section>

      <section className={`${panelCls} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            贡献列表 <span className="text-xs font-normal text-ink/40">（{list.length}）</span>
          </h2>
          {reviewer && (
            <div className="flex items-center gap-1.5 text-[11px] text-ink/50">
              审核可信度
              <select
                value={credibility}
                onChange={(e) => setCredibility(e.target.value as 'A' | 'B' | 'C')}
                className="rounded-lg border border-ink/15 bg-paper px-1.5 py-0.5 text-[11px]"
              >
                {CREDIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {notice && (
          <p
            className={`mb-3 flex items-start gap-1.5 rounded-lg p-2.5 text-[11px] ${
              notice.kind === 'ok' ? 'bg-forest/10 text-forest' : 'bg-red-50 text-red-600'
            }`}
          >
            {notice.kind === 'ok' ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {notice.text}
          </p>
        )}

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
            <Inbox className="mx-auto mb-2 h-6 w-6 text-ink/30" />
            还没有提交过贡献。
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => {
              const st = STATUS_LABEL[c.status];
              const hasQuote = (c.quote ?? '').trim().length >= 8;
              const busy = busyId === c.id;
              return (
                <li key={c.id} className="rounded-xl border border-ink/5 bg-ink/[0.02] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{c.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${st.cls}`}>{st.text}</span>
                    {c.credibility && (
                      <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[10px] text-ink/50">
                        可信度 {c.credibility}
                      </span>
                    )}
                    {c.points ? (
                      <span className="rounded bg-forest/10 px-1.5 py-0.5 text-[10px] text-forest">
                        +{c.points} 积分
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 break-all text-[11px] text-ink/45">
                    {c.category} · {c.url}
                  </p>

                  {hasQuote ? (
                    <p className="mt-1.5 rounded-lg bg-paper/70 p-2 text-[11px] leading-relaxed text-ink/65">
                      原文摘录：{c.quote}
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-1 rounded-lg bg-gold/10 p-2 text-[11px] text-gold">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      缺少原文摘录，无法通过审核（只能作为线索）。
                    </p>
                  )}

                  {reviewer && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.status === 'pending' || c.status === 'needs_info') && (
                        <>
                          <button
                            type="button"
                            onClick={() => void decide(c, 'published')}
                            disabled={!hasQuote || busy}
                            className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-medium text-forest transition hover:bg-forest/20 disabled:opacity-40"
                          >
                            <Check className="h-3 w-3" />
                            {busy ? '处理中…' : '通过并记分'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void decide(c, 'needs_info')}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] text-gold transition hover:bg-gold/25 disabled:opacity-40"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            待补充证据
                          </button>
                        </>
                      )}
                      {c.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => void decide(c, 'rejected')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] text-red-500 transition hover:bg-red-100 disabled:opacity-40"
                        >
                          <X className="h-3 w-3" />
                          驳回
                        </button>
                      )}
                      {c.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => void decide(c, 'pending')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] text-ink/60 transition hover:bg-ink/10 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3 w-3" />
                          重新提交审核
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!reviewer && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-ink/[0.03] p-2.5 text-[11px] text-ink/55">
            <LogIn className="h-3.5 w-3.5" />
            {sessionStatus === 'loading'
              ? '正在确认登录状态…'
              : signedIn
                ? `当前账号角色为「${sessionRole ?? 'student'}」，没有审核权限。`
                : '审核需要以教师 / 管理员账号登录。'}
            <Link href="/login" className="font-medium text-accent hover:underline">
              去登录
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}