'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Building2, Info } from 'lucide-react';

type Plan = {
  id: string;
  name: string;
  price: string;
  unit: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    unit: '',
    tagline: '先看清差距，再决定要不要投入',
    features: [
      '3 分钟快速诊断（五维差距雷达）',
      '基础成长路径规划',
      '本地记忆（IndexedDB，免登即用）',
      '双非友好岗位库浏览',
    ],
    cta: '当前方案',
  },
  {
    id: 'pro',
    name: '会员版',
    price: '¥19.9',
    unit: '/月',
    tagline: '全流程陪伴，从诊断到拿到 Offer',
    features: [
      '五 Skill 全量不限次（诊断 / 规划 / 练兵 / 信息差 / 包装）',
      '长记忆云同步，跨设备「记得你」',
      '简历深度优化 + 项目经历润色',
      '模拟面试题库与纠偏反馈',
      '双非友好岗位优先推荐',
    ],
    highlight: true,
    cta: '模拟购买',
  },
  {
    id: 'edu',
    name: '高校版',
    price: '¥5-15',
    unit: '/人/年',
    tagline: '就业指导中心统一采购',
    features: [
      '包含会员版全部能力',
      '批量开通与管理后台',
      '班级 / 学院成长看板',
      '就业进展统计与导出',
      '专属落地培训与答疑',
    ],
    cta: '联系我们',
  },
];

export default function PricingPage() {
  const [purchased, setPurchased] = useState<string | null>(null);

  const handleBuy = (plan: Plan) => {
    if (plan.id === 'free') return;
    // 演示流程：不接真实支付，仅记录一次模拟结果
    try {
      localStorage.setItem('mock_plan', plan.id);
    } catch {
      /* 隐私模式忽略 */
    }
    setPurchased(plan.id);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">选择适合你的方案</h1>
        <p className="mt-2 text-sm text-ink/60">
          免费版即可完成一次完整诊断。会员版面向需要长期陪伴的同学。
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isPurchased = purchased === plan.id;
          return (
            <section
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-paper p-6 ${
                plan.highlight
                  ? 'border-accent/50 shadow-[0_18px_40px_-28px_rgba(224,89,46,0.6)]'
                  : 'border-accent/15'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[11px] font-medium text-paper">
                  最受欢迎
                </span>
              )}

              <h2 className="font-serif text-lg font-bold text-ink">{plan.name}</h2>
              <p className="mt-1 text-xs text-ink/50">{plan.tagline}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-ink">{plan.price}</span>
                {plan.unit && <span className="text-sm text-ink/50">{plan.unit}</span>}
              </div>

              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm leading-relaxed text-ink/70">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleBuy(plan)}
                disabled={plan.id === 'free'}
                className={`mt-6 rounded-full px-4 py-2 text-sm font-medium transition ${
                  plan.id === 'free'
                    ? 'border border-ink/15 text-ink/50'
                    : plan.highlight
                      ? 'bg-accent text-paper hover:bg-[#c94a23]'
                      : 'border border-ink/15 text-ink hover:border-accent/40 hover:text-accent'
                } ${isPurchased ? 'opacity-70' : ''}`}
              >
                {isPurchased ? '已模拟开通' : plan.cta}
              </button>

              {plan.id === 'edu' && (
                <p className="mt-2 text-center text-[11px] text-ink/35">
                  需学校统一对接，暂不支持个人购买
                </p>
              )}
            </section>
          );
        })}
      </div>

      {purchased && purchased !== 'free' && (
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-forest/40 bg-forest/[0.06] p-4 text-sm text-forest">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            已模拟开通「{PLANS.find((p) => p.id === purchased)?.name}」。
            <strong className="font-medium">这是演示流程，未接入真实支付</strong>
            ，不会产生任何费用，刷新页面后可再次体验。
          </span>
        </div>
      )}

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-ink/10 bg-ink/[0.02] p-4 text-xs leading-relaxed text-ink/55">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" />
        <span>
          定价参考方案 v3.6 的商业化设想（Freemium ¥19.9/月 + B2B2C 高校 ¥5-15/人/年）。
          当前为参赛演示版本，支付与订阅系统不在本期实现范围内。
        </span>
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/assistant?tab=diagnose"
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-5 py-2 text-sm font-medium text-accent transition hover:bg-accent/5"
        >
          先免费做一次诊断
        </Link>
      </div>
    </main>
  );
}
