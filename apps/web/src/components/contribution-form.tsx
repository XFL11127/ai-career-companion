'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { addContribution, type InfoKind } from '@/lib/infobase';
import { loadRoleUser } from '@/lib/role';

const TYPE_OPTIONS: { label: string; kind: InfoKind; category: string }[] = [
  { label: '岗位', kind: 'job', category: '岗位' },
  { label: '内推', kind: 'job', category: '内推' },
  { label: '面经', kind: 'learning', category: '面经' },
  { label: '资源链接', kind: 'learning', category: '学习' },
  { label: '学校信息', kind: 'school', category: '学校' },
];

/**
 * 手动贡献表单（UC-B5）：提交后写入 localStorage，status=pending（待审核队列）。
 * 未来由高校老师/系统维护员审核后入资源库（见 项目说明.md 身份制度）。
 */
export function ContributionForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setType(TYPE_OPTIONS[0]);
    setTitle('');
    setUrl('');
    setSummary('');
    setContact('');
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    const user = loadRoleUser();
    addContribution({
      kind: type.kind,
      title,
      url,
      summary,
      contact: contact.trim() || undefined,
      category: type.category,
      ownerId: user.id,
      ownerRole: user.role,
    });
    setSubmitting(false);
    setDone(true);
    reset();
    onSubmitted?.();
    // 2.5s 后收起成功提示
    setTimeout(() => setDone(false), 2500);
  }

  const inputCls =
    'w-full rounded-xl border border-ink/15 bg-white/60 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-accent/50';

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPE_OPTIONS.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => setType(o)}
            aria-pressed={type.label === o.label}
            className={`rounded-full px-2.5 py-1 text-xs transition ${
              type.label === o.label
                ? 'bg-accent text-paper'
                : 'border border-ink/15 text-ink/60 hover:border-accent/40 hover:text-accent'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <input
        className={inputCls}
        placeholder="标题（如：某某公司 2027 软开实习）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className={inputCls}
        placeholder="原文链接 https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />
      <textarea
        className={inputCls}
        placeholder="一句话摘要（不抓取正文，仅存链接与摘要，符合合规红线）"
        rows={2}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <input
        className={inputCls}
        placeholder="联系方式（选填，内推/面经可留微信）"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !url.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper transition hover:bg-[#c94a23] disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          提交贡献
        </button>
        {done && (
          <span className="inline-flex items-center gap-1 text-xs text-forest">
            <Check className="h-3.5 w-3.5" />
            已提交，状态：待审核
          </span>
        )}
      </div>
      <p className="text-[11px] text-ink/35">
        提交内容将进入审核队列，由高校老师 / 系统维护员审核通过后公开展示。
      </p>
    </form>
  );
}
