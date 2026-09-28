'use client';

/**
 * 手动贡献表单（UC-B5）
 *
 * 证据规则（本层核心）：
 * - 想标注「双非友好」，必须同时给出「来源链接 + 原文摘录」，缺一不可；
 * - 审核通过由高校老师/系统维护员执行，机器只做白名单自动放行；
 * - 云端（Supabase）可用时写入审核队列，不可用时退回本机草稿并明确告知用户。
 */

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { addContribution, type InfoKind } from '@/lib/infobase';
import { loadRoleUser } from '@/lib/role';

interface TypeOption {
  label: string;
  kind: InfoKind;
  category: string;
  apiKind: string;
  needsCompany: boolean;
}

const TYPE_OPTIONS: TypeOption[] = [
  { label: '岗位', kind: 'job', category: '岗位', apiKind: 'job', needsCompany: true },
  { label: '实习', kind: 'job', category: '实习', apiKind: 'internship', needsCompany: true },
  { label: '内推', kind: 'job', category: '内推', apiKind: 'job', needsCompany: true },
  { label: '招聘公告', kind: 'policy', category: '公告', apiKind: 'policy', needsCompany: true },
  { label: '面经', kind: 'learning', category: '面经', apiKind: 'interview_exp', needsCompany: false },
  { label: '资源链接', kind: 'learning', category: '学习', apiKind: 'resource', needsCompany: false },
  { label: '学校信息', kind: 'school', category: '学校', apiKind: 'school', needsCompany: false },
];

const SIGNAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'degree_barrier', label: '学历门槛（本科及以上等）' },
  { value: 'school_list', label: '院校要求（不限院校等）' },
  { value: 'bonus', label: '加分项（不限专业/项目优先）' },
  { value: 'historical_admit', label: '历史录取（公示名单）' },
  { value: 'policy', label: '政策依据' },
  { value: 'deadline', label: '时间窗口（截止时间）' },
];

const MIN_QUOTE = 8;

export function ContributionForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [quote, setQuote] = useState('');
  const [signal, setSignal] = useState('degree_barrier');
  const [summary, setSummary] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function reset() {
    setTitle('');
    setCompany('');
    setRole('');
    setUrl('');
    setQuote('');
    setSummary('');
    setContact('');
  }

  const quoteOk = quote.trim().length >= MIN_QUOTE;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    const user = loadRoleUser();
    const payload = {
      kind: type.apiKind,
      title,
      summary,
      url,
      company: company || undefined,
      role: role || undefined,
      signal,
      quote: quote || undefined,
      contact: contact || undefined,
      ownerId: user.id,
      ownerRole: user.role,
    };

    let message = '已提交，状态：待审核（本机保存，云端未配置）';
    try {
      const res = await fetch('/api/hub/contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        message = '已提交到云端审核队列，状态：待审核';
      } else {
        throw new Error('cloud unavailable');
      }
    } catch {
      addContribution({
        kind: type.kind,
        title,
        url,
        summary,
        contact: contact.trim() || undefined,
        category: type.category,
        company,
        role,
        signal,
        quote,
        ownerId: user.id,
        ownerRole: user.role,
      });
    }

    setSubmitting(false);
    setResult({ ok: true, text: message });
    reset();
    onSubmitted?.();
    setTimeout(() => setResult(null), 3500);
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
        placeholder="标题（如：某某公司 2027 软件研发实习招聘公告）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder={type.needsCompany ? '企业名称（必填）' : '企业名称（选填）'}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="岗位 / 项目名称（选填）"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      <input
        className={inputCls}
        placeholder="来源链接 https://…（必须是公告原文页）"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
      />

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-ink/60">原文摘录（决定能否显示「双非友好」）</span>
          <span className={`text-[11px] ${quoteOk ? 'text-forest' : 'text-ink/40'}`}>
            {quote.trim().length}/{MIN_QUOTE} 字
          </span>
        </div>
        <textarea
          className={inputCls}
          rows={3}
          placeholder="从公告原文里逐字复制一句话，例如「本科及以上学历，不限毕业院校」"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-ink/40">
          {quoteOk
            ? '已附原文摘录，审核通过后这条信息会显示可核对的证据。'
            : '没有原文摘录的投稿不会被标记为「双非友好」，只能作为线索。'}
        </p>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-ink/60">信号类型</div>
        <select
          className={inputCls}
          value={signal}
          onChange={(e) => setSignal(e.target.value)}
        >
          {SIGNAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className={inputCls}
        placeholder="一句话摘要（仅存链接与摘要，不抓取正文，符合合规红线）"
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !url.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper transition hover:bg-[#c94a23] disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          提交贡献
        </button>
        {result && (
          <span className="inline-flex items-center gap-1 text-xs text-forest">
            <Check className="h-3.5 w-3.5" />
            {result.text}
          </span>
        )}
      </div>
      <p className="text-[11px] text-ink/35">
        提交内容进入审核队列；由高校老师 / 系统维护员核对原文后才能公开展示。
      </p>
    </form>
  );
}