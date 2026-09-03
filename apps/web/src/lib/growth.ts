/**
 * 成长体系数据层 — 打卡 / 积分 / 简历 / 画像编辑
 *
 * 存储：localStorage（免登即用）。
 * ⚠️ 说明：任务书 T-010/011/014 原定落 Supabase（`checkins`/`points`/`profiles` 表），
 * 但 A 的 Supabase 尚未交付，故本模块先以 localStorage 草稿实现，UI 与交互可完整验收；
 * Supabase 就绪后只需替换本文件的读写实现（对外函数签名不变），页面无需改动。
 */

import { loadProfile, saveProfile, type UserProfileData } from './profile';

// ---------- 数据结构 ----------

export interface PointRecord {
  date: string;
  points: number;
  reason: string;
}

export interface GrowthData {
  checkins: string[];
  points: number;
  history: PointRecord[];
  updatedAt: number;
}

/** 简历面板数据（T-011）：来自五 Skill 对话自动抽取 + 用户手动补充。 */
export interface ResumeData {
  basics: {
    name: string;
    school: string;
    grade: string;
    major: string;
    targetRole: string;
  };
  skills: string[];
  projects: { name: string; desc: string }[];
  updatedAt: number;
}

const GROWTH_KEY = 'growth_data';
const RESUME_KEY = 'resume_data';

// ---------- 工具 ----------

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const POINTS_PER_CHECKIN = 10;
export const POINTS_PER_SKILL = 5;

// ---------- 成长数据读写 ----------

export function defaultGrowth(): GrowthData {
  return { checkins: [], points: 0, history: [], updatedAt: Date.now() };
}

export function loadGrowth(): GrowthData {
  if (!isBrowser()) return defaultGrowth();
  try {
    const raw = localStorage.getItem(GROWTH_KEY);
    if (!raw) return defaultGrowth();
    const parsed = JSON.parse(raw) as Partial<GrowthData>;
    return {
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins : [],
      points: typeof parsed.points === 'number' ? parsed.points : 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return defaultGrowth();
  }
}

function saveGrowth(data: GrowthData): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(GROWTH_KEY, JSON.stringify({ ...data, updatedAt: Date.now() }));
  } catch {
    /* 隐私模式 / 配额超限时静默降级 */
  }
}

/** 今日是否已打卡 */
export function hasCheckedInToday(): boolean {
  return loadGrowth().checkins.includes(todayKey());
}

/**
 * 打卡。今日已打卡则返回 false（不重复加积分）。
 * 返回是否产生了新的打卡。
 */
export function checkInToday(): boolean {
  if (!isBrowser()) return false;
  const data = loadGrowth();
  const key = todayKey();
  if (data.checkins.includes(key)) return false;

  data.checkins.push(key);
  data.points += POINTS_PER_CHECKIN;
  data.history.unshift({ date: key, points: POINTS_PER_CHECKIN, reason: '每日打卡' });
  data.history = data.history.slice(0, 100);
  saveGrowth(data);
  return true;
}

/** 增加积分（Skill 调用、任务完成等）。失败静默。 */
export function addPoints(points: number, reason: string): void {
  if (!isBrowser() || points <= 0) return;
  const data = loadGrowth();
  data.points += points;
  data.history.unshift({ date: todayKey(), points, reason });
  data.history = data.history.slice(0, 100);
  saveGrowth(data);
}

/** 连续打卡天数（含今天则算今天）。 */
export function getStreak(checkins: string[] = loadGrowth().checkins): number {
  if (checkins.length === 0) return 0;
  const set = new Set(checkins);
  let streak = 0;
  const cursor = new Date();
  // 今天没打卡时不立刻归零，从昨天开始回溯（避免白天未打卡显示 0）
  if (!set.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 取某年某月的打卡日期集合（供月历着色）。month 为 1-12。 */
export function getMonthCheckins(year: number, month: number): Set<string> {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return new Set(loadGrowth().checkins.filter((d) => d.startsWith(prefix)));
}

// ---------- 简历数据读写 ----------

export function defaultResume(): ResumeData {
  return {
    basics: { name: '', school: '', grade: '', major: '', targetRole: '' },
    skills: [],
    projects: [],
    updatedAt: Date.now(),
  };
}

export function loadResume(): ResumeData {
  if (!isBrowser()) return defaultResume();
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return defaultResume();
    const parsed = JSON.parse(raw) as Partial<ResumeData>;
    return {
      basics: { ...defaultResume().basics, ...(parsed.basics ?? {}) },
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return defaultResume();
  }
}

export function saveResume(data: ResumeData): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ ...data, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

/**
 * 从用户画像同步基础字段到简历（T-011「对话自动抽取」的简化版：
 * 抽抽取结果存于 profile.ts，这里同步到简历面板，用户可再手动编辑）。
 */
export function syncResumeFromProfile(): ResumeData {
  const profile = loadProfile();
  const resume = loadResume();
  resume.basics = {
    name: resume.basics.name || profile.nickname || '',
    school: resume.basics.school || profile.school || '',
    grade: resume.basics.grade || profile.grade || '',
    major: resume.basics.major || profile.major || '',
    targetRole: resume.basics.targetRole || profile.targetRole || '',
  };
  saveResume(resume);
  return resume;
}

// ---------- 画像编辑（T-014）----------

/** 更新画像字段并持久化。 */
export function updateProfile(patch: Partial<UserProfileData>): UserProfileData {
  const next = { ...loadProfile(), ...patch };
  saveProfile(next);
  return next;
}

/** 简历优化建议：基于当前简历与画像生成可执行的改进提示。 */
export function getResumeSuggestions(resume: ResumeData): string[] {
  const tips: string[] = [];
  const { basics, skills, projects } = resume;

  if (!basics.targetRole) {
    tips.push('先明确目标岗位，诊断一次并到「路径规划」生成目标，简历才有针对性。');
  }
  if (projects.length === 0) {
    tips.push('至少补充 1 个项目经历——双非简历最缺的就是可验证的动手证据。');
  } else {
    const hasNumber = projects.some((p) => /\d/.test(p.desc));
    if (!hasNumber) {
      tips.push('项目描述缺少量化成果，建议用 STAR 法则补上「做了什么 + 提升多少」。');
    }
  }
  if (skills.length < 3) {
    tips.push('技能项少于 3 条，建议补齐与目标岗位匹配的技术栈关键词。');
  }
  if (!basics.school) {
    tips.push('补充学校与专业，便于 AI 按双非背景给出更贴合的投递建议。');
  }
  const tooLong = projects.reduce((s, p) => s + p.desc.length, 0) > 600;
  if (tooLong) {
    tips.push('项目描述偏长，建议压缩到一页 A4 内，保留最有说服力的 2 个项目。');
  }
  if (tips.length === 0) {
    tips.push('简历要素齐全。下一步建议用「成果包装」Skill 生成针对性润色版本。');
  }
  return tips;
}

// ---------- 能力成长轨迹（W2 D13）----------
// 数据来源（方案 A）：每次「破局诊断」返回后，把雷达五维值存为一条带日期的快照，
// 形成时间序列后即可在数据看板画出能力增长曲线。
// Supabase 就绪后同样只替换本段的读写实现，对外函数签名不变。

const ABILITY_KEY = 'ability_snapshots';

export interface AbilitySnapshot {
  /** YYYY-MM-DD */
  date: string;
  ts: number;
  /** 来源 Skill，当前仅 diagnose 会产出雷达 */
  source: string;
  radar: { name: string; current: number; target?: number }[];
}

export function loadAbilitySnapshots(): AbilitySnapshot[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(ABILITY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is AbilitySnapshot =>
        !!s && typeof (s as AbilitySnapshot).date === 'string' && Array.isArray((s as AbilitySnapshot).radar)
    );
  } catch {
    return [];
  }
}

/** 记录一次能力快照。同一天重复诊断则覆盖当天记录（保留最新一次）。 */
export function saveAbilitySnapshot(
  radar: { name: string; current: number; target?: number }[],
  source = 'diagnose'
): void {
  if (!isBrowser() || !radar?.length) return;
  try {
    const list = loadAbilitySnapshots().filter((s) => s.date !== todayKey());
    list.push({ date: todayKey(), ts: Date.now(), source, radar });
    const trimmed = list.sort((a, b) => a.ts - b.ts).slice(-60);
    localStorage.setItem(ABILITY_KEY, JSON.stringify(trimmed));
  } catch {
    /* 隐私模式 / 配额超限时静默降级 */
  }
}

/** 把快照序列压成 Recharts 可直接消费的趋势数据（按日期升序，MM-DD 作 X 轴）。 */
export function getAbilityTrend(days = 30): Record<string, string | number>[] {
  const all = loadAbilitySnapshots();
  if (all.length === 0) return [];
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return all
    .filter((s) => s.ts >= since)
    .map((s) => {
      const row: Record<string, string | number> = { date: s.date.slice(5) };
      s.radar.forEach((d) => {
        row[d.name] = d.current;
      });
      return row;
    });
}

/** 最近一次快照的维度列表，供图表动态生成折线。 */
export function getLatestAbilityDims(): string[] {
  const all = loadAbilitySnapshots();
  if (all.length === 0) return [];
  return all[all.length - 1].radar.map((d) => d.name);
}
