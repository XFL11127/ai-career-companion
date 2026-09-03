'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import {
  Flame,
  Coins,
  CalendarDays,
  UserCircle2,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  Radar as RadarIcon,
  Route,
  Target,
  Newspaper,
  Briefcase,
} from 'lucide-react';
import { loadProfile, type UserProfileData } from '@/lib/profile';
import { SectionCard, Field } from '@/components/skill-ui';
import {
  loadGrowth,
  loadResume,
  saveResume,
  checkInToday,
  hasCheckedInToday,
  getStreak,
  getMonthCheckins,
  syncResumeFromProfile,
  getResumeSuggestions,
  updateProfile,
  POINTS_PER_CHECKIN,
  loadAbilitySnapshots,
  getAbilityTrend,
  getLatestAbilityDims,
  type GrowthData,
  type ResumeData,
} from '@/lib/growth';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const SKILLS = [
  { key: 'diagnose', label: '破局诊断', icon: RadarIcon },
  { key: 'plan', label: '路径规划', icon: Route },
  { key: 'practice', label: '实战练兵', icon: Target },
  { key: 'info', label: '信息差', icon: Newspaper },
  { key: 'package', label: '成果包装', icon: Briefcase },
] as const;

const ABILITY_COLORS = ['#E0592E', '#2f7d5b', '#d9a441', '#3b6fb5', '#8a5cd1'];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [checkedToday, setCheckedToday] = useState(false);
  const [saved, setSaved] = useState(false);

  // 月历状态
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  useEffect(() => {
    setGrowth(loadGrowth());
    setProfile(loadProfile());
    setResume(loadResume());
    setCheckedToday(hasCheckedInToday());
    setLoading(false);
  }, []);

  const streak = useMemo(() => getStreak(growth?.checkins ?? []), [growth]);
  const monthSet = useMemo(
    () => getMonthCheckins(cursor.year, cursor.month),
    [cursor, growth]
  );

  // 月历格子：前置空白 + 当月天数
  const daysGrid = useMemo(() => {
    const total = new Date(cursor.year, cursor.month, 0).getDate();
    const firstWeekday = new Date(cursor.year, cursor.month - 1, 1).getDay();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: total }, (_, i) => i + 1),
    ];
  }, [cursor]);

  const handleCheckIn = useCallback(() => {
    const added = checkInToday();
    setGrowth(loadGrowth());
    setCheckedToday(true);
    if (added) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, []);

  const handleSaveProfile = useCallback(() => {
    if (!profile) return;
    updateProfile({
      nickname: profile.nickname,
      school: profile.school,
      grade: profile.grade,
      major: profile.major,
      targetRole: profile.targetRole,
    });
    setResume(syncResumeFromProfile());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [profile]);

  const handleSaveResume = useCallback(() => {
    if (!resume) return;
    saveResume(resume);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [resume]);

  // 能力成长轨迹（融合数据看板）— 所有 hook 必须先于 early return，避免 React 检测到 hooks 顺序变化
  const snapshots = useMemo(() => loadAbilitySnapshots(), [growth]);
  const trend = useMemo(() => getAbilityTrend(30), [growth]);
  const dims = useMemo(() => getLatestAbilityDims(), [growth]);

  if (loading || !growth || !profile || !resume) {
    return (
      <main className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-10 text-ink/60">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <span>正在读取你的成长数据…</span>
      </main>
    );
  }

  const suggestions = getResumeSuggestions(resume);

  // 等级 / 每日经验（融合数据看板）
  const level = Math.floor(growth.points / 100) + 1;
  const levelProgress = growth.points % 100;
  const badges = [
    { name: '初来乍到', desc: '进入学职同伴', ok: true },
    { name: '坚持打卡', desc: '连续打卡 ≥3 天', ok: streak >= 3 },
    { name: '打卡狂人', desc: '连续打卡 ≥7 天', ok: streak >= 7 },
    { name: '积分破百', desc: '累计积分 ≥100', ok: growth.points >= 100 },
    { name: '破局诊断', desc: '完成一次诊断', ok: snapshots.length > 0 },
    { name: '简历就绪', desc: '补充 ≥1 个项目', ok: (resume.projects?.length ?? 0) >= 1 },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">我的成长</h1>
          <p className="mt-1 text-sm text-ink/60">
            打卡 · 等级 · 积分 · 画像 · 简历 · 能力轨迹 —— 数据暂存本地，接入 Supabase 后自动上云
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 rounded-full border border-forest/40 bg-forest/10 px-3 py-1 text-xs font-medium text-forest">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已保存
          </span>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 概览 + 打卡 */}
        <SectionCard title="打卡与积分" icon={<Flame className="h-5 w-5" />}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700">
              <Flame className="h-4 w-4" />
              连续 {streak} 天
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold">
              <Coins className="h-4 w-4" />
              {growth.points} 积分
            </div>
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkedToday}
              className="ml-auto rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-paper transition hover:bg-[#c94a23] disabled:opacity-50"
            >
              {checkedToday ? '今日已打卡' : `打卡 +${POINTS_PER_CHECKIN}`}
            </button>
          </div>

          {/* 月历 */}
          <div className="rounded-xl border border-ink/10 p-3">
            <div className="mb-2 flex items-center justify-between text-sm text-ink/70">
              <button
                type="button"
                onClick={() =>
                  setCursor((c) =>
                    c.month === 1
                      ? { year: c.year - 1, month: 12 }
                      : { year: c.year, month: c.month - 1 }
                  )
                }
                className="rounded px-2 py-1 transition hover:bg-ink/5"
                aria-label="上个月"
              >
                ←
              </button>
              <span className="font-medium">
                {cursor.year} 年 {cursor.month} 月
              </span>
              <button
                type="button"
                onClick={() =>
                  setCursor((c) =>
                    c.month === 12
                      ? { year: c.year + 1, month: 1 }
                      : { year: c.year, month: c.month + 1 }
                  )
                }
                className="rounded px-2 py-1 transition hover:bg-ink/5"
                aria-label="下个月"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink/40">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
              {daysGrid.map((d, i) => {
                if (d === null) return <div key={`pad-${i}`} />;
                const key = `${cursor.year}-${String(cursor.month).padStart(2, '0')}-${String(
                  d
                ).padStart(2, '0')}`;
                const done = monthSet.has(key);
                return (
                  <div
                    key={key}
                    className={`rounded-md py-1.5 text-xs transition ${
                      done ? 'bg-accent/15 font-medium text-accent' : 'text-ink/50'
                    }`}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          </div>

          {growth.history.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto">
              {growth.history.slice(0, 8).map((h, i) => (
                <div key={i} className="flex justify-between text-xs text-ink/50">
                  <span>{h.reason}</span>
                  <span>
                    {h.date} · +{h.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 画像编辑 */}
        <SectionCard title="我的画像" icon={<UserCircle2 className="h-5 w-5" />} extra="可编辑">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="昵称"
              value={profile.nickname ?? ''}
              onChange={(v) => setProfile({ ...profile, nickname: v })}
              placeholder="怎么称呼你"
            />
            <Field
              label="学校"
              value={profile.school ?? ''}
              onChange={(v) => setProfile({ ...profile, school: v })}
              placeholder="如：某某大学"
            />
            <Field
              label="年级"
              value={profile.grade ?? ''}
              onChange={(v) => setProfile({ ...profile, grade: v })}
              placeholder="如：大三"
            />
            <Field
              label="专业"
              value={profile.major ?? ''}
              onChange={(v) => setProfile({ ...profile, major: v })}
              placeholder="如：软件工程"
            />
            <div className="sm:col-span-2">
              <Field
                label="目标岗位"
                value={profile.targetRole ?? ''}
                onChange={(v) => setProfile({ ...profile, targetRole: v })}
                placeholder="如：前端开发"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="mt-4 rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:bg-ink/85"
          >
            保存画像并同步到简历
          </button>
          {profile.summary && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-ink/[0.03] px-3 py-2 text-xs leading-relaxed text-ink/60">
              {profile.summary}
            </p>
          )}
        </SectionCard>

        {/* 简历面板 */}
        <SectionCard
          title="简历数据"
          icon={<FileText className="h-5 w-5" />}
          extra={resume.updatedAt ? '已保存' : '未填写'}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="姓名"
              value={resume.basics.name}
              onChange={(v) =>
                setResume({ ...resume, basics: { ...resume.basics, name: v } })
              }
            />
            <Field
              label="学校"
              value={resume.basics.school}
              onChange={(v) =>
                setResume({ ...resume, basics: { ...resume.basics, school: v } })
              }
            />
            <Field
              label="年级"
              value={resume.basics.grade}
              onChange={(v) =>
                setResume({ ...resume, basics: { ...resume.basics, grade: v } })
              }
            />
            <Field
              label="专业"
              value={resume.basics.major}
              onChange={(v) =>
                setResume({ ...resume, basics: { ...resume.basics, major: v } })
              }
            />
            <div className="sm:col-span-2">
              <Field
                label="目标岗位"
                value={resume.basics.targetRole}
                onChange={(v) =>
                  setResume({ ...resume, basics: { ...resume.basics, targetRole: v } })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="技能（英文逗号分隔）"
                value={resume.skills.join('、')}
                onChange={(v) =>
                  setResume({
                    ...resume,
                    skills: v
                      .split(/[、,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="如：JavaScript、React、TypeScript"
              />
            </div>
          </div>

          {/* 项目经历 */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-ink/50">项目经历</span>
              <button
                type="button"
                onClick={() =>
                  setResume({
                    ...resume,
                    projects: [...resume.projects, { name: '', desc: '' }],
                  })
                }
                className="flex items-center gap-1 rounded-full border border-ink/15 px-2.5 py-1 text-xs text-ink/70 transition hover:border-accent/40 hover:text-accent"
              >
                <Plus className="h-3 w-3" />
                添加
              </button>
            </div>
            {resume.projects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-ink/15 p-4 text-center text-xs text-ink/40">
                还没有项目经历。补充 1~2 个项目，双非简历最缺的就是可验证的动手证据。
              </p>
            ) : (
              <div className="space-y-2">
                {resume.projects.map((p, i) => (
                  <div key={i} className="rounded-xl border border-ink/10 p-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={p.name}
                        onChange={(e) => {
                          const next = [...resume.projects];
                          next[i] = { ...p, name: e.target.value };
                          setResume({ ...resume, projects: next });
                        }}
                        placeholder="项目名称"
                        className="flex-1 rounded-lg border border-ink/15 bg-background px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setResume({
                            ...resume,
                            projects: resume.projects.filter((_, idx) => idx !== i),
                          })
                        }
                        className="rounded p-1.5 text-ink/40 transition hover:text-red-500"
                        aria-label="删除项目"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={p.desc}
                      onChange={(e) => {
                        const next = [...resume.projects];
                        next[i] = { ...p, desc: e.target.value };
                        setResume({ ...resume, projects: next });
                      }}
                      placeholder="用 STAR 法则描述：做了什么、用了什么技术、量化结果如何"
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-ink/15 bg-background px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveResume}
            className="mt-4 rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:bg-ink/85"
          >
            保存简历
          </button>
        </SectionCard>

        {/* 优化建议 */}
        <SectionCard title="简历优化建议" icon={<Sparkles className="h-5 w-5" />}>
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-xl border border-ink/10 bg-ink/[0.02] px-3 py-2 text-sm leading-relaxed text-ink/70"
              >
                <span className="mt-0.5 shrink-0 text-accent">·</span>
                {s}
              </li>
            ))}
          </ul>
          <Link
            href="/assistant?tab=package"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-4 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/5"
          >
            去「成果包装」生成润色版
          </Link>
        </SectionCard>

        {/* 等级与徽章（融合数据看板） */}
        <SectionCard title="等级与徽章" icon={<Sparkles className="h-5 w-5" />}>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-base font-bold text-accent">
              Lv.{level}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">双非破局者 · 第 {level} 级</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${levelProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink/40">
                距下一级还需 {100 - levelProgress} 积分（当前 {growth.points}）
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.name}
                title={b.desc}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                  b.ok ? 'bg-forest/10 text-forest' : 'bg-ink/5 text-ink/40'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                {b.name}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* 能力成长轨迹（融合数据看板） */}
        <SectionCard
          title="能力成长轨迹"
          icon={<Sparkles className="h-5 w-5" />}
          extra={snapshots.length ? `${snapshots.length} 次诊断` : '待诊断'}
        >
          {trend.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink/40">
              还没有能力数据。去「助手 → 破局诊断」扫描一次，这里会画出你的五维成长曲线。
            </p>
          ) : (
            <div className="space-y-4">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(0,0,0,0.3)" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="rgba(0,0,0,0.3)" />
                    <Tooltip />
                    {dims.map((d, i) => (
                      <Line
                        key={d}
                        type="monotone"
                        dataKey={d}
                        stroke={ABILITY_COLORS[i % ABILITY_COLORS.length]}
                        dot={false}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {snapshots.length > 0 && (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={snapshots[snapshots.length - 1].radar} outerRadius="72%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <Radar dataKey="current" stroke="#E0592E" fill="#E0592E" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* 五 Skill 使用（融合数据看板） */}
        <SectionCard title="五 Skill 使用" icon={<Sparkles className="h-5 w-5" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SKILLS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.key}
                  href={`/assistant?tab=${s.key}`}
                  className="flex flex-col items-center gap-1 rounded-xl border border-ink/10 p-3 text-center transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="text-xs text-ink/70">{s.label}</span>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink/40">
            点击直接进入对应 Skill；每次使用会累计积分（详见「打卡与积分」记录）。
          </p>
        </SectionCard>
      </div>
    </main>
  );
}
