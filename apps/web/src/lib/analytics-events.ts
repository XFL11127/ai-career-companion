/**
 * L1 埋点层 — skill_events 本地事件流
 *
 * 结构对齐 Supabase 表 `skill_events`（见 supabase/migrations/002_analytics_memory.sql）：
 *   id uuid / user_id text / skill_name text / payload jsonb / created_at timestamptz
 *
 * 存储位置：localStorage（免登即用、与后端解耦，T-008 验收标准即「读取 localStorage 真实 skill_events」）。
 * 后端 Worker 在配置 Supabase 时会另行写入同一张表；本模块是**前端侧数据源**，
 * 保证无网络 / Supabase 未配置时任务流卡片与看板仍有真实数据可展示。
 */

import type { SkillName } from '@ai-career-companion/types';

export interface SkillEvent {
  id: string;
  user_id: string;
  skill_name: SkillName;
  payload: Record<string, unknown>;
  created_at: string;
}

const STORAGE_KEY = 'skill_events';
const MAX_EVENTS = 200;

export const SKILL_LABELS: Record<SkillName, string> = {
  diagnose: '破局诊断',
  plan: '路径规划',
  practice: '实战练兵',
  info: '信息差填平',
  package: '成果包装',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 读取全部事件（按时间倒序）。无数据或异常时返回空数组。 */
export function loadSkillEvents(): SkillEvent[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is SkillEvent => !!e && typeof e.created_at === 'string')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

/** 读取最近 N 天内的事件（按时间倒序）。 */
export function loadSkillEventsInDays(days: number): SkillEvent[] {
  const since = Date.now() - days * 86400000;
  return loadSkillEvents().filter((e) => new Date(e.created_at).getTime() >= since);
}

/** 写入一条事件。失败静默，绝不阻塞主流程。 */
export function appendSkillEvent(
  skill: SkillName,
  payload: Record<string, unknown> = {},
  userId = 'local'
): void {
  if (!isBrowser()) return;
  try {
    const event: SkillEvent = {
      id: randomId(),
      user_id: userId,
      skill_name: skill,
      payload,
      created_at: new Date().toISOString(),
    };
    const next = [event, ...loadSkillEvents()].slice(0, MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 隐私模式 / 配额超限时静默降级 */
  }
}

/** 按天聚合活跃数，返回连续的 days 天序列（无数据的天补 0）。 */
export function aggregateDailyActive(days: number): { date: string; active: number }[] {
  const events = loadSkillEventsInDays(days);
  const byDay = new Map<string, number>();
  for (const e of events) {
    const d = new Date(e.created_at);
    const k = `${d.getMonth() + 1}/${d.getDate()}`;
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  return Array.from({ length: days }).map((_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    const k = `${d.getMonth() + 1}/${d.getDate()}`;
    return { date: k, active: byDay.get(k) ?? 0 };
  });
}

/** 各 Skill 调用次数分布。 */
export function aggregateSkillDistribution(
  events: SkillEvent[] = loadSkillEvents()
): { skill: string; count: number }[] {
  const bySkill = new Map<SkillName, number>();
  for (const e of events) {
    bySkill.set(e.skill_name, (bySkill.get(e.skill_name) ?? 0) + 1);
  }
  return Array.from(bySkill.entries())
    .map(([skill, count]) => ({ skill: SKILL_LABELS[skill] ?? skill, count }))
    .sort((a, b) => b.count - a.count);
}

/** 清空事件（调试 / 重置演示数据用）。 */
export function clearSkillEvents(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
