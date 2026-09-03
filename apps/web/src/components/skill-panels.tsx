'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSkill } from '@/lib/useSkill';
import { loadResult } from '@/lib/db';
import { saveUserProfile } from '@/lib/memory';
import { loadResume, saveResume, type ResumeData } from '@/lib/growth';
import {
  RadarChart,
  Card,
  Pill,
  LoadingState,
  ErrorState,
  EmptyState,
  Field,
} from '@/components/skill-ui';
import { MemoryPanel } from '@/components/MemoryPanel';
import { ArrowRight, PartyPopper, Plus, Trash2 } from 'lucide-react';
import type { SkillName, DiagnoseOutput } from '@ai-career-companion/types';

type OnNext = (tab: SkillName) => void;

// ==================== Diagnose ====================
export function DiagnosePanel({ onNext }: { onNext?: OnNext }) {
  const { data, loading, error, run } = useSkill('diagnose');
  const [text, setText] = useState('');
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (data) {
      if (localStorage.getItem('hasAchievement') !== 'diagnose') {
        setShowBadge(true);
        localStorage.setItem('hasAchievement', 'diagnose');
      }
      localStorage.setItem('hasDiagnosed', 'true');
      const content = text || '双非大三学生，计算机专业，想做前端开发，暂时没有实习';
      const gradeMatch = content.match(/(大一|大二|大三|大四|研一|研二|研三)/);
      const majorMatch = content.match(
        /(计算机|软件|电子|通信|自动化|大数据|人工智能|数据科学|软件工程)/
      );
      const targetMatch = content.match(/(前端|后端|算法|测试|产品|运营|开发|工程师)/);
      const gapMatch = content.match(/(缺乏|没有|不足|不够|需要)/);
      const summary =
        [
          majorMatch?.[0] ? `${majorMatch[0]}专业` : '',
          gradeMatch?.[0] || '',
          targetMatch?.[0] ? `目标${targetMatch[0]}` : '',
          gapMatch ? '有明显差距' : '',
        ]
          .filter(Boolean)
          .join('，') || content.slice(0, 20);
      saveUserProfile(summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const start = () =>
    run({
      userId: 'local',
      messages: [
        { role: 'user', content: text || '双非大三学生，计算机专业，想做前端开发，暂时没有实习' },
      ],
    });

  return (
    <div>
      <MemoryPanel skill="diagnose" />
      {showBadge && data && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 font-bold text-amber-800">
          <PartyPopper className="h-5 w-5 shrink-0" />
          初次诊断达成！你已迈出破局第一步
        </div>
      )}
      <Card className="mt-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="简单介绍你自己（专业 / 年级 / 目标岗位 / 现状）…"
          className="h-28 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={start}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '诊断中…' : '开始诊断'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="填写上方信息，生成你的五维能力雷达图" />}
      {loading && !data && <LoadingState label="正在扫描五维差距…" />}

      {data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>{data.radar && <RadarChart radar={data.radar} />}</Card>
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">推荐岗位</h3>
            <div className="mt-3 space-y-3">
              {data.recommendedRoles?.map((r, i) => (
                <div key={i} className="rounded-2xl border border-ink/10 bg-paper p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{r.role}</span>
                    <Pill tone="accent">匹配 {r.matchScore}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-ink/60">{r.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onNext?.('plan')}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            规划你的成长路径 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Plan ====================
const DEFAULT_DIAGNOSE: DiagnoseOutput = {
  radar: [
    { name: '技术栈', current: 40, target: 80, gap: 40 },
    { name: '实习经历', current: 20, target: 70, gap: 50 },
    { name: '项目经历', current: 30, target: 75, gap: 45 },
    { name: '算法能力', current: 35, target: 70, gap: 35 },
    { name: '信息差', current: 25, target: 65, gap: 40 },
  ],
  recommendedRoles: [],
};

export function PlanPanel({ onNext }: { onNext?: OnNext }) {
  const { data, loading, error, run } = useSkill('plan');
  const [diagnose, setDiagnose] = useState<DiagnoseOutput | null>(null);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-plan-shown')) {
        setShowBadge(true);
        localStorage.setItem('badge-plan-shown', 'true');
      }
      localStorage.setItem('hasPlanned', 'true');
      const gaps = diagnose?.radar?.filter((r) => r.gap > 20).map((r) => r.name) || [];
      const summary =
        gaps.length > 0 ? `已规划路径，重点提升：${gaps.join('、')}` : '已规划成长路径';
      saveUserProfile(summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    loadResult('diagnose')
      .then((d) => setDiagnose((d as DiagnoseOutput) ?? null))
      .catch(() => {});
  }, []);

  const start = () => run(diagnose ?? DEFAULT_DIAGNOSE);

  return (
    <div>
      <MemoryPanel skill="plan" />
      {showBadge && data && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="h-5 w-5 shrink-0" />
          路径规划达成！成长蓝图已就绪
        </div>
      )}
      <Card className="mt-6">
        <p className="text-sm text-ink/60">
          {diagnose
            ? '已读取你的破局诊断结果，将据此生成路径。'
            : '未找到诊断结果，将使用示例差距生成默认路径。'}
        </p>
        <button
          onClick={start}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '生成中…' : '生成成长路径'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="点击上方按钮，生成你的阶段化成长路径" />}
      {loading && !data && <LoadingState label="正在规划路径…" />}

      {data && (
        <div className="mt-6 space-y-4">
          {data.milestones?.map((m, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-ink">{m.title}</h3>
                <Pill tone="gold">{m.dayRange} 天</Pill>
              </div>
              <ul className="mt-3 space-y-2">
                {m.actions?.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-2xl bg-paper p-3">
                    <Pill
                      tone={
                        a.type === 'project' ? 'accent' : a.type === 'apply' ? 'forest' : 'gold'
                      }
                    >
                      {a.type}
                    </Pill>
                    <div>
                      <div className="font-medium text-ink">{a.title}</div>
                      <div className="text-sm text-ink/60">{a.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onNext?.('practice')}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            开始实战练兵 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Practice ====================
type PracticeMode = 'interview' | 'algorithm' | 'project';

const PRACTICE_MODE_LABEL: Record<PracticeMode, string> = {
  interview: '模拟面试',
  algorithm: '算法刷题',
  project: '项目实战',
};

export function PracticePanel({ onNext }: { onNext?: OnNext }) {
  const { data, loading, error, run } = useSkill('practice');
  const [mode, setMode] = useState<PracticeMode>('interview');
  const [topic, setTopic] = useState('');
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-practice-shown')) {
        setShowBadge(true);
        localStorage.setItem('badge-practice-shown', 'true');
      }
      const summary = topic
        ? `${PRACTICE_MODE_LABEL[mode]}练习：${topic}`
        : `${PRACTICE_MODE_LABEL[mode]}练习`;
      saveUserProfile(summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const start = () => run({ mode, topic: topic || undefined });

  return (
    <div>
      <MemoryPanel skill="practice" />
      {showBadge && data && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="mr-1.5 inline h-5 w-5 align-[-2px]" />
          实战练兵达成！每次练习都是进步
        </div>
      )}
      <Card className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRACTICE_MODE_LABEL) as PracticeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                mode === m
                  ? 'bg-accent text-paper'
                  : 'border border-ink/15 text-ink/60 hover:border-ink/40'
              }`}
            >
              {PRACTICE_MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="可选：指定主题，如「React 性能优化」"
          className="w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={start}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '生成中…' : '开始练兵'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="选择模式，生成针对性问题与纠偏反馈" />}
      {loading && !data && <LoadingState label="正在准备题目…" />}

      {data && (
        <div className="mt-6 space-y-4">
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">问题</h3>
            <ul className="mt-3 list-decimal space-y-2 pl-5 text-ink/80">
              {data.questions?.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Card>
          {data.feedback && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">纠偏反馈</h3>
              <p className="mt-3 text-ink/70">{data.feedback}</p>
            </Card>
          )}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onNext?.('info')}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            填补信息差 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Info ====================
export function InfoPanel({ onNext }: { onNext?: OnNext }) {
  const { data, loading, error, run } = useSkill('info');
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-info-shown')) {
        setShowBadge(true);
        localStorage.setItem('badge-info-shown', 'true');
      }
      const roles = data.jobs?.map((j) => j.role) || [];
      const summary =
        roles.length > 0 ? `关注岗位：${roles.slice(0, 2).join('、')}` : '正在搜索双非友好机会';
      saveUserProfile(summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const start = () => run({ userId: 'local' });

  return (
    <div>
      <MemoryPanel skill="info" />
      {showBadge && data && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="mr-1.5 inline h-5 w-5 align-[-2px]" />
          信息聚合达成！双非友好机会已为你准备
        </div>
      )}
      <Card className="mt-6">
        <button
          onClick={start}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '聚合中…' : '聚合双非友好信息'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="点击上方按钮，获取最新双非友好机会" />}
      {loading && !data && <LoadingState label="正在聚合信息…" />}

      {data && (
        <div className="mt-6 space-y-3">
          {data.jobs?.map((j, i) => (
            <Link
              key={i}
              href={`/company/${encodeURIComponent(j.company)}`}
              className="card-lift block rounded-3xl border border-ink/10 bg-white/70 p-5 transition hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-ink">
                  {j.role} · {j.company}
                </div>
                <Pill tone="forest">{j.salary}</Pill>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <span>{j.location}</span>
                {j.tags?.map((t, ti) => (
                  <Pill key={ti} tone="gold">
                    {t}
                  </Pill>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onNext?.('package')}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            包装你的成果 <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Package (含简历数据面板) ====================
function buildResumeText(r: ResumeData): string {
  const lines = [
    `${r.basics.name || '（姓名）'} · ${r.basics.school || '（学校）'} · ${r.basics.grade || '（年级）'} · ${r.basics.major || '（专业）'}`,
    `目标岗位：${r.basics.targetRole || '（目标岗位）'}`,
    `技能：${r.skills.join('、') || '（技能）'}`,
    ...r.projects.map((p) => `项目：${p.name} - ${p.desc}`),
  ];
  return lines.join('\n');
}

export function PackagePanel() {
  const { data, loading, error, run } = useSkill('package');
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [showBadge, setShowBadge] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const r = loadResume();
    setResume(r);
    if (r.basics.targetRole) setTargetRole(r.basics.targetRole);
    if (r.basics.name) setResumeText(buildResumeText(r));
  }, []);

  useEffect(() => {
    if (data) {
      if (!localStorage.getItem('badge-package-shown')) {
        setShowBadge(true);
        localStorage.setItem('badge-package-shown', 'true');
      }
      const target = targetRole || '前端开发工程师';
      const summary = `目标岗位：${target}，已优化简历`;
      saveUserProfile(summary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleSaveResume = () => {
    if (!resume) return;
    saveResume(resume);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setResumeText(buildResumeText(resume));
    if (resume.basics.targetRole) setTargetRole(resume.basics.targetRole);
  };

  const start = () =>
    run({
      resumeText: resumeText || '（示例）双非大三，做过课程项目，无实习经历，熟悉 HTML/CSS/JS',
      targetRole: targetRole || '前端开发工程师',
    });

  return (
    <div>
      <MemoryPanel skill="package" />
      {showBadge && data && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <PartyPopper className="mr-1.5 inline h-5 w-5 align-[-2px]" />
          成果包装达成！你的经历已焕然一新
        </div>
      )}

      {/* 简历数据面板（与 profile 页面共享 growth.ts） */}
      {resume && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-ink">简历数据</h3>
            {saved && <span className="text-xs text-forest">已保存</span>}
          </div>
          <p className="mt-1 text-xs text-ink/50">
            在此维护简历基础信息，保存后自动同步到下方包装表单
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="姓名"
              value={resume.basics.name}
              onChange={(v) => setResume({ ...resume, basics: { ...resume.basics, name: v } })}
            />
            <Field
              label="学校"
              value={resume.basics.school}
              onChange={(v) => setResume({ ...resume, basics: { ...resume.basics, school: v } })}
            />
            <Field
              label="年级"
              value={resume.basics.grade}
              onChange={(v) => setResume({ ...resume, basics: { ...resume.basics, grade: v } })}
            />
            <Field
              label="专业"
              value={resume.basics.major}
              onChange={(v) => setResume({ ...resume, basics: { ...resume.basics, major: v } })}
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
                label="技能（逗号分隔）"
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
                  setResume({ ...resume, projects: [...resume.projects, { name: '', desc: '' }] })
                }
                className="flex items-center gap-1 rounded-full border border-ink/15 px-2.5 py-1 text-xs text-ink/70 transition hover:border-accent/40 hover:text-accent"
              >
                <Plus className="h-3 w-3" /> 添加
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
        </Card>
      )}

      {/* 成果包装表单 */}
      <Card className="mt-6 space-y-3">
        <input
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="目标岗位，如「前端开发工程师」"
          className="w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="粘贴你的简历原文，或先在上方维护简历数据后自动同步"
          className="h-32 w-full rounded-2xl border border-ink/15 bg-paper p-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button
          onClick={start}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
        >
          {loading ? '包装中…' : '开始包装'}
        </button>
      </Card>

      {error && <ErrorState message={error} onRetry={start} />}
      {!error && !data && !loading && <EmptyState label="填入简历与目标岗位，生成优化版本" />}
      {loading && !data && <LoadingState label="正在包装成果…" />}

      {data && (
        <div className="mt-6 space-y-4">
          {data.optimizedResume && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">优化简历</h3>
              <p className="mt-3 whitespace-pre-wrap text-ink/80">{data.optimizedResume}</p>
            </Card>
          )}
          <Card>
            <h3 className="font-serif text-lg font-bold text-ink">项目量化亮点</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
              {data.projectBullets?.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </Card>
          {data.interviewReview && (
            <Card>
              <h3 className="font-serif text-lg font-bold text-ink">面试复盘</h3>
              <p className="mt-3 text-ink/70">{data.interviewReview}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
