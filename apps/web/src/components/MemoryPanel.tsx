'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SkillName } from '@ai-career-companion/types';
import { loadProfile } from '@/lib/profile';
import { recallTurns, getStreak, type MemoryTurn } from '@/lib/memory';
import { Brain, RefreshCw, Flame, UserCircle2, MessageSquareText, ChevronDown } from 'lucide-react';

/**
 * Q3 记忆回顾面板（游客本地优先）。
 *
 * 实现「详情页读取记忆」：挂载时从本地读取
 *  - L2 用户画像（localStorage，由 profile.ts 维护）
 *  - L1 最近会话轮次（IndexedDB，由 memory.ts 维护）
 *  - 连续活跃天数（localStorage streak）
 *
 * 登录后（后续阶段）可在 loadLocal 之后追加从 Worker /memory 按 user_id 拉取云端记忆并合并。
 */
export function MemoryPanel({ skill }: { skill: SkillName }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ReturnType<typeof loadProfile> | null>(null);
  const [turns, setTurns] = useState<MemoryTurn[]>([]);
  const [streak, setStreak] = useState(0);

  const loadLocal = useCallback(async () => {
    setLoading(true);
    const [p, t, s] = await Promise.all([
      Promise.resolve(loadProfile()),
      recallTurns(skill, 3).catch(() => [] as MemoryTurn[]),
      Promise.resolve(getStreak()),
    ]);
    setProfile(p);
    setTurns(t);
    setStreak(s);
    setLoading(false);
  }, [skill]);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const identity = profile
    ? [
        profile.school,
        profile.grade,
        profile.major,
        profile.targetRole && `目标${profile.targetRole}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const hasData =
    !!identity ||
    (profile &&
      profile.totalDiagnoses +
        profile.totalPlans +
        profile.totalPractices +
        profile.totalInfo +
        profile.totalPackages >
        0) ||
    turns.length > 0;

  return (
    <section className="mt-4 rounded-2xl border border-accent/15 bg-paper">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <Brain className="h-4 w-4 text-accent" />
        <span className="font-medium text-ink">记忆回顾</span>
        {hasData ? (
          <span className="rounded-full bg-forest/10 px-2 py-0.5 text-xs text-forest">
            已从本地读取
          </span>
        ) : (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/50">暂无记忆</span>
        )}
        <span className="ml-auto flex items-center gap-2 text-ink/40">
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadLocal();
            }}
            title="刷新记忆"
            className="rounded-md p-1 hover:bg-ink/5 hover:text-ink"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="border-t border-accent/10 px-4 py-3">
          {loading ? (
            <p className="text-xs text-ink/40">读取本地记忆中…</p>
          ) : !hasData ? (
            <p className="text-xs leading-relaxed text-ink/50">
              还没有任何本地记忆。在首页完成一次 Skill 对话后，这里会显示你的画像与最近上下文。
            </p>
          ) : (
            <div className="space-y-3">
              {identity && (
                <div className="flex items-start gap-2 text-sm text-ink/80">
                  <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    <span className="text-ink/50">身份：</span>
                    {identity}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-gold">
                  <Flame className="h-3.5 w-3.5" />
                  连续活跃 {streak} 天
                </span>
                {profile && (
                  <>
                    {profile.totalDiagnoses > 0 && <Tag label={`诊断 ${profile.totalDiagnoses}`} />}
                    {profile.totalPlans > 0 && <Tag label={`规划 ${profile.totalPlans}`} />}
                    {profile.totalPractices > 0 && <Tag label={`练兵 ${profile.totalPractices}`} />}
                    {profile.totalInfo > 0 && <Tag label={`信息 ${profile.totalInfo}`} />}
                    {profile.totalPackages > 0 && <Tag label={`包装 ${profile.totalPackages}`} />}
                  </>
                )}
              </div>

              {turns.length > 0 && (
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink/60">
                    <MessageSquareText className="h-3.5 w-3.5" />本 Skill 最近本地对话
                  </p>
                  <ul className="space-y-1.5">
                    {turns.map((t, i) => {
                      const input = typeof t.input === 'string' ? t.input : JSON.stringify(t.input);
                      const summary = input.length > 80 ? input.slice(0, 80) + '…' : input;
                      return (
                        <li
                          key={i}
                          className="rounded-lg border border-ink/5 bg-ink/[0.02] px-3 py-1.5 text-xs text-ink/60"
                        >
                          {summary || '(空输入)'}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {profile?.summary && (
                <p className="rounded-lg bg-ink/[0.02] px-3 py-2 text-xs leading-relaxed text-ink/55">
                  {profile.summary}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Tag({ label }: { label: string }) {
  return <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink/60">{label}</span>;
}
