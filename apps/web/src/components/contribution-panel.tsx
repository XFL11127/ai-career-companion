'use client';

import { useState } from 'react';
import { panelCls } from '@/components/skill-ui';
import { Check, X, Inbox } from 'lucide-react';
import { loadContributions, reviewContribution, type InfoItem } from '@/lib/infobase';
import { canReview, loadRole } from '@/lib/role';
import { ContributionForm } from '@/components/contribution-form';

const STATUS_LABEL: Record<InfoItem['status'], { text: string; cls: string }> = {
  pending: { text: '待审核', cls: 'bg-gold/15 text-gold' },
  published: { text: '已发布', cls: 'bg-forest/15 text-forest' },
  rejected: { text: '已驳回', cls: 'bg-red-100 text-red-500' },
};

/**
 * 用户贡献（UC-B5）：手动表单 + 贡献列表（带审核状态）。
 * 审核由高校老师/系统维护员执行（本期前端占位，见 项目说明.md 身份制度）。
 */
export function ContributionPanel({ onChanged }: { onChanged?: () => void }) {
  const role = loadRole();
  const reviewer = canReview(role);
  const [list, setList] = useState<InfoItem[]>(() => loadContributions());

  function refresh() {
    setList(loadContributions());
    onChanged?.();
  }

  function decide(id: string, decision: 'published' | 'rejected') {
    reviewContribution(id, decision);
    refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className={`${panelCls} p-5`}>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">提交贡献</h2>
        <ContributionForm onSubmitted={refresh} />
      </section>

      <section className={`${panelCls} p-5`}>
        <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">
          我的贡献 <span className="text-xs font-normal text-ink/40">（{list.length}）</span>
        </h2>
        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
            <Inbox className="mx-auto mb-2 h-6 w-6 text-ink/30" />
            还没有提交过贡献。
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => {
              const st = STATUS_LABEL[c.status];
              return (
                <li
                  key={c.id}
                  className="flex items-start gap-3 rounded-xl border border-ink/5 bg-ink/[0.02] p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{c.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${st.cls}`}>
                        {st.text}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink/50">
                      {c.category} · {c.url}
                    </p>
                  </div>
                  {reviewer && c.status === 'pending' && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => decide(c.id, 'published')}
                        aria-label="通过"
                        className="rounded-full bg-forest/10 p-1.5 text-forest transition hover:bg-forest/20"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(c.id, 'rejected')}
                        aria-label="驳回"
                        className="rounded-full bg-red-50 p-1.5 text-red-500 transition hover:bg-red-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
