'use client';
import type { ReactNode } from 'react';
import type { GapDimension, SkillName } from '@ai-career-companion/types';

/** 轻量 SVG 五维雷达图（不依赖 recharts，符合依赖克制）。 */
export function RadarChart({ radar, size = 300 }: { radar: GapDimension[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 42;
  const n = radar.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number): [number, number] => {
    const r = (Math.max(0, Math.min(100, v)) / 100) * R;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  };
  const poly = (key: 'current' | 'target') =>
    radar.map((d, i) => pt(i, d[key]).join(',')).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-full max-w-[320px]"
      role="img"
      aria-label="五维能力雷达图"
    >
      {[1, 0.66, 0.33].map((f, gi) => (
        <polygon
          key={gi}
          points={radar.map((_, i) => pt(i, 100 * f).join(',')).join(' ')}
          fill="none"
          stroke="rgb(var(--ink) / 0.12)"
          strokeWidth={1}
        />
      ))}
      {radar.map((_, i) => {
        const [x, y] = pt(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgb(var(--ink) / 0.12)"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={poly('target')}
        fill="rgb(var(--forest) / 0.08)"
        stroke="rgb(var(--forest) / 0.6)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <polygon
        points={poly('current')}
        fill="rgb(var(--accent) / 0.18)"
        stroke="rgb(var(--accent))"
        strokeWidth={2}
      />
      {radar.map((d, i) => {
        const [x, y] = pt(i, 118);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink text-[11px]"
          >
            {d.name}
            <tspan className="fill-accent"> {d.current}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`card-lift rounded-3xl border border-ink/10 bg-white/70 p-6 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function Pill({
  tone = 'accent',
  children,
}: {
  tone?: 'accent' | 'forest' | 'gold';
  children: ReactNode;
}) {
  const cls =
    tone === 'forest'
      ? 'bg-forest/10 text-forest'
      : tone === 'gold'
        ? 'bg-gold/10 text-forest'
        : 'bg-accent/10 text-accent';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="mt-6 animate-fade-in rounded-3xl border border-ink/10 bg-white/70 p-10 text-center text-ink/50">
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      出错了：{message}
      {onRetry && (
        <button onClick={onRetry} className="ml-3 underline">
          重试
        </button>
      )}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-ink/15 bg-white/40 p-10 text-center text-ink/40">
      {label}
    </div>
  );
}

/** 带标题栏的区块卡片：图标 + 标题 + 右侧 extra。全站统一的"面板"外观。 */
export function SectionCard({
  title,
  icon,
  extra,
  children,
  className = '',
}: {
  title: string;
  icon?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-accent/15 bg-paper p-5 shadow-[0_18px_40px_-28px_rgba(31,27,22,0.4)] ${className}`}
    >
      <header className="mb-4 flex items-center gap-2 text-ink">
        {icon && <span className="text-accent">{icon}</span>}
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {extra && <div className="ml-auto text-xs text-ink/40">{extra}</div>}
      </header>
      {children}
    </section>
  );
}

/** 统一的受控文本输入（带标签）。用于画像 / 简历等表单。 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink/50">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink/15 bg-background px-3 py-2 text-sm text-ink outline-none transition focus:border-accent"
      />
    </label>
  );
}

/** 面板基础样式（圆角卡片外观）。各组件直接拼接到自身 className，避免引入额外 DOM 层级与闭合标签错配。 */
export const panelCls = 'rounded-2xl border border-accent/15 bg-paper';

// ---------- Kimi 式对话组件 ----------

/** 气泡：用户（右/强调色）与 AI（左/白底），支持流式中间态。 */
export function ProseBubble({
  children,
  tone = 'assistant',
}: {
  children: ReactNode;
  tone?: 'user' | 'assistant';
}) {
  const cls =
    tone === 'user'
      ? 'ml-auto bg-accent text-paper'
      : 'mr-auto bg-white/80 border border-ink/10 text-ink';
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed ${cls}`}
    >
      {children}
    </div>
  );
}

type AnyObj = Record<string, any>;

/** 把某个 Skill 的结构化卡片（流式 partial 也安全）渲染成富卡片。 */
export function SkillCardView({ name, data }: { name: SkillName; data: unknown }) {
  const d = data as AnyObj | null;
  if (!d) return null;

  switch (name) {
    case 'diagnose':
      return (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {d.radar && (
            <Card>
              <RadarChart radar={d.radar} />
            </Card>
          )}
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">推荐岗位</h3>
            <div className="mt-3 space-y-3">
              {(d.recommendedRoles ?? []).map((r: AnyObj, i: number) => (
                <div key={i} className="rounded-2xl border border-ink/10 bg-paper p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{r?.role}</span>
                    {r?.matchScore != null && <Pill tone="accent">匹配 {r.matchScore}</Pill>}
                  </div>
                  {r?.reason && <p className="mt-1 text-sm text-ink/60">{r.reason}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      );

    case 'plan':
      return (
        <div className="mt-3 space-y-3">
          {(d.milestones ?? []).map((m: AnyObj, i: number) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-ink">{m?.title}</h3>
                {m?.dayRange && <Pill tone="gold">{m.dayRange} 天</Pill>}
              </div>
              <ul className="mt-3 space-y-2">
                {(m?.actions ?? []).map((a: AnyObj, ai: number) => (
                  <li key={ai} className="rounded-2xl border border-ink/10 bg-paper p-3">
                    <div className="font-medium text-ink">{a?.title}</div>
                    {a?.description && (
                      <div className="mt-1 text-sm text-ink/60">{a.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      );

    case 'practice':
      return (
        <div className="mt-3 space-y-3">
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">问题</h3>
            <ul className="mt-3 list-decimal space-y-2 pl-5 text-ink/80">
              {(d.questions ?? []).map((q: string, i: number) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Card>
          {d.feedback && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">纠偏反馈</h3>
              <p className="mt-3 text-ink/80">{d.feedback}</p>
            </Card>
          )}
        </div>
      );

    case 'info':
      return (
        <div className="mt-3 space-y-2">
          {(d.jobs ?? []).map((j: AnyObj, i: number) => (
            <a
              key={i}
              href={j?.url}
              target="_blank"
              rel="noreferrer"
              className="card-lift block rounded-2xl border border-ink/10 bg-white/70 p-4 transition hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-ink">
                  {j?.role} · {j?.company}
                </div>
                {j?.salary && <Pill tone="forest">{j.salary}</Pill>}
              </div>
              <div className="mt-1 text-sm text-ink/60">
                {j?.location} {j?.tags?.join?.(' / ')}
              </div>
            </a>
          ))}
        </div>
      );

    case 'package':
      return (
        <div className="mt-3 space-y-3">
          {d.optimizedResume && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">优化简历</h3>
              <p className="mt-3 whitespace-pre-wrap text-ink/80">{d.optimizedResume}</p>
            </Card>
          )}
          {(d.projectBullets ?? []).length > 0 && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">项目量化亮点</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
                {(d.projectBullets ?? []).map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </Card>
          )}
          {d.interviewReview && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">面试复盘</h3>
              <p className="mt-3 text-ink/80">{d.interviewReview}</p>
            </Card>
          )}
        </div>
      );

    case 'resume':
      return (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between"><span className="text-sm text-ink/60">综合评分</span><Pill tone="accent">{Math.round(d.overallScore ?? 0)}</Pill></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm text-ink/60">ATS 可解析度</span><Pill tone="forest">{Math.round(d.atsScore ?? 0)}</Pill></div>
            <div className="mt-4 flex flex-wrap gap-1.5">{(d.missingKeywords ?? []).slice(0, 8).map((k: string, i: number) => <Pill key={`${k}-${i}`} tone="gold">{k}</Pill>)}</div>
          </Card>
          <Card><h3 className="font-serif text-lg font-bold text-ink">优化预览</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/70">{d.optimizedResume}</p></Card>
        </div>
      )

    case 'interview':
      return (
        <div className="mt-3 space-y-3">
          <Card><h3 className="font-serif text-lg font-bold text-ink">面试问题</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink/75">{(d.questions ?? []).map((q: AnyObj, i: number) => <li key={q.id ?? i}>{q.question}</li>)}</ol></Card>
          {d.scoreCard && <Card><div className="flex items-center justify-between"><span className="font-medium text-ink">本轮评分</span><Pill tone="forest">{Math.round(d.scoreCard.overall ?? 0)}</Pill></div><p className="mt-2 text-sm text-ink/65">{d.scoreCard.feedback}</p></Card>}
        </div>
      )

    case 'match':
      return (
        <div className="mt-3 space-y-3">
          <Card><div className="flex items-center justify-between"><h3 className="font-serif text-lg font-bold text-ink">五维匹配</h3><Pill tone={d.recommendation === 'recommend' ? 'forest' : d.recommendation === 'avoid' ? 'accent' : 'gold'}>{Math.round(d.overallScore ?? 0)}</Pill></div><div className="mt-3 space-y-2">{(d.dimensions ?? []).map((x: AnyObj) => <div key={x.key} className="flex items-center justify-between rounded-xl bg-ink/[0.025] px-3 py-2 text-sm"><span className="text-ink/70">{x.name}</span><span className="font-medium text-ink">{x.score}</span></div>)}</div></Card>
        </div>
      )

    case 'course':
      return (
        <div className="mt-3 space-y-3">
          <Card><h3 className="font-serif text-lg font-bold text-ink">知识总览</h3><p className="mt-2 text-sm leading-6 text-ink/70">{d.summary}</p></Card>
          <Card><h3 className="font-serif text-lg font-bold text-ink">关键概念</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink/75">{(d.concepts ?? []).slice(0, 6).map((c: AnyObj, i: number) => <li key={i}><strong>{c.term}</strong>：{c.explanation}</li>)}</ul></Card>
        </div>
      )

    case 'assessment':
      return (
        <div className="mt-3 space-y-3">
          <Card><h3 className="font-serif text-lg font-bold text-ink">{d.profileTitle} · {d.profileCode}</h3><p className="mt-2 text-sm leading-6 text-ink/70">{d.disclaimer}</p><div className="mt-3 flex flex-wrap gap-1.5">{(d.traits ?? []).map((x: string) => <Pill key={x} tone="forest">{x}</Pill>)}</div></Card>
          <Card><h3 className="font-serif text-lg font-bold text-ink">推荐探索方向</h3><ul className="mt-3 space-y-2 text-sm text-ink/75">{(d.recommendedCareers ?? []).map((c: AnyObj, i: number) => <li key={i} className="flex items-center justify-between gap-3"><span>{c.role}</span><Pill tone="accent">{c.fitScore}</Pill></li>)}</ul></Card>
        </div>
      )
  }
  return null;
}