'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Maximize2,
  RotateCcw,
  Sparkles,
  Users,
  WalletCards,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import surveyData from '@/lib/survey-insight.json';

type BranchCode = 'A' | 'B' | 'C';
type BranchFilter = 'ALL' | BranchCode;
type FeatureDef = { key: string; label: string; group: string };
type BranchInfo = {
  code: BranchCode;
  label: string;
  n: number;
  pct: number;
  summary: string;
  radar: { axis: string; value: number }[];
};
type Respondent = {
  branch: BranchCode;
  branch_label: string;
  school_level: string;
  school_group: string;
  major_type: string;
  job_urgency?: string | null;
  payment?: string | null;
  payment_mid_cny?: number | null;
  privacy?: string | null;
  privacy_local_pref_score?: number | null;
  ai_tool_experience?: string | null;
  primary_feature_mean?: number | null;
  pain_points?: string[];
  platform_pref?: string[];
  [key: string]: unknown;
};
type TestRow = {
  branch: BranchCode;
  test: string;
  method: string;
  note: string;
  H?: number;
  rho?: number;
  p: number;
  n: number;
  groups?: number;
};
type InsightData = {
  meta: {
    title: string;
    subtitle: string;
    generated_at: string;
    n: number;
    branch_counts: Record<BranchCode, number>;
    note: string;
  };
  branches: BranchInfo[];
  pain_points: { label: string; count: number; pct: number; base_n: number }[];
  payment: { branch: BranchCode; branch_label: string; budget: string; count: number; pct: number }[];
  privacy: { label: string; count: number; pct: number }[];
  ai_tool: { label: string; count: number; pct: number }[];
  platforms: { label: string; count: number; pct: number; base_n: number }[];
  identity: { label: string; count: number; pct: number }[];
  school: { label: string; count: number; pct: number }[];
  major: { label: string; count: number; pct: number }[];
  school_branch: { school: string; branch: BranchCode; n: number; mean: number | null }[];
  tests: TestRow[];
  respondents: Respondent[];
  feature_defs: Record<BranchCode, FeatureDef[]>;
};

const DATA = surveyData as unknown as InsightData;
const ALL = '全部';
const BRANCH_COLORS: Record<BranchCode, string> = { A: '#2F6B5E', B: '#C48A2C', C: '#B94E36' };
const BRANCH_BG: Record<BranchCode, string> = { A: 'bg-[#E7F0EA] text-[#2F6B5E] border-[#B8D2C6]', B: 'bg-[#FBF0D9] text-[#9A6A1E] border-[#E5C98E]', C: 'bg-[#F9E5DE] text-[#A44330] border-[#E2B5A8]' };
const CARD = 'rounded-2xl border border-[#E4D3BD] bg-[#FFFDF8]/95 p-4 shadow-[0_18px_45px_-30px_rgba(77,54,35,0.42)] backdrop-blur';
const TOOLTIP_STYLE = { background: '#FFF9EF', border: '1px solid #E4D3BD', borderRadius: 12, color: '#2B241D', fontSize: 12 };
const GRID_COLOR = 'rgba(80,60,42,.14)';
const AXIS_COLOR = '#77695B';
const SCALE_COLORS = ['#2F6B5E', '#C48A2C', '#B94E36', '#7B5EA7', '#3C7A89'];

type FeatureStat = FeatureDef & { branch: BranchCode; mean: number; high: number; n: number };
function numberValue(row: Respondent, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
function fmt(value: number | null | undefined, digits = 2): string {
  return value == null ? '—' : value.toFixed(digits);
}
function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}
function matchesFilter(row: Respondent, branch: BranchFilter, school: string, major: string, urgency: string): boolean {
  if (branch !== 'ALL' && row.branch !== branch) return false;
  if (school !== ALL && row.school_level !== school) return false;
  if (major !== ALL && row.major_type !== major) return false;
  if (urgency !== ALL && row.branch === 'C' && row.job_urgency !== urgency) return false;
  return true;
}
function countBy(rows: Respondent[], selector: (row: Respondent) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = selector(row);
    if (key) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
function buildFeatureStats(rows: Respondent[], activeBranches: BranchCode[]): FeatureStat[] {
  const output: FeatureStat[] = [];
  for (const branch of activeBranches) {
    const branchRows = rows.filter((row) => row.branch === branch);
    for (const def of DATA.feature_defs[branch]) {
      const values = branchRows.map((row) => numberValue(row, def.key)).filter((value): value is number => value != null);
      const avg = mean(values);
      if (avg == null) continue;
      output.push({ ...def, branch, mean: avg, high: percent(values.filter((value) => value >= 4).length, values.length), n: values.length });
    }
  }
  return output;
}

function ChartCard({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${CARD} flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-[#2B241D]">{title}</h2>
          {subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#77695B]">{subtitle}</p> : null}
        </div>
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D95D39] shadow-[0_0_12px_rgba(217,93,57,.45)]" />
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-xs leading-6 text-slate-400">{text}</div>;
}

function PersonaRadar({ branch, rows }: { branch: BranchCode; rows: Respondent[] }) {
  const branchRows = rows.filter((row) => row.branch === branch);
  const source = DATA.branches.find((item) => item.code === branch);
  const axes: Record<BranchCode, [string, string[]][]> = {
    A: [['课程整理', ['course_a1', 'course_a2']], ['学习路径', ['course_a3', 'course_a4']], ['职业探索', ['career_b1', 'career_b2', 'career_b3']], ['成长支持', ['career_b4', 'career_b5']]],
    B: [['简历优化', ['resume_c1', 'resume_c2', 'resume_c3', 'resume_c4', 'resume_c5']], ['面试准备', ['interview_d1', 'interview_d2', 'interview_d3', 'interview_d4', 'interview_d5']], ['求职决策', ['job_match_importance', 'full_journey_importance', 'offer_eval_importance']], ['信息服务', ['industry_brief_importance', 'portfolio_importance', 'transition_importance']]],
    C: [['自动化效率', ['automation_e1', 'automation_e2', 'automation_e3', 'automation_e4', 'automation_e5']], ['投递监控', ['dashboard_f1', 'dashboard_f2', 'dashboard_f3', 'dashboard_f4', 'dashboard_f5']], ['Offer决策', ['offer_g1', 'offer_g2', 'offer_g3', 'offer_g4', 'offer_g5']], ['匹配评估', ['five_dim_importance', 'browser_autofill_score']]],
  };
  const data = axes[branch].map(([axis, keys]) => {
    const values = branchRows.flatMap((row) => keys.map((key) => numberValue(row, key)).filter((value): value is number => value != null));
    return { axis, value: Number((mean(values) ?? 0).toFixed(2)) };
  });
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${BRANCH_BG[branch]}`}>{source?.label}</span>
        <span className="text-[10px] text-slate-400">n={branchRows.length}</span>
      </div>
      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <ReRadarChart data={data} outerRadius="66%">
            <PolarGrid stroke={GRID_COLOR} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[1, 5]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={BRANCH_COLORS[branch]} fill={BRANCH_COLORS[branch]} fillOpacity={0.2} strokeWidth={2} />
            <ReTooltip contentStyle={TOOLTIP_STYLE} />
          </ReRadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const FLOW_TEMPLATES: Record<BranchCode, { need: string; feature: string; key: string }[]> = {
  A: [
    { need: '规划与学习效率', feature: '自适应学习路径', key: 'course_a4' },
    { need: '知识整理', feature: '课件摘要与思维导图', key: 'course_a1' },
    { need: '方向探索', feature: '行业/岗位探索图谱', key: 'career_b2' },
  ],
  B: [
    { need: '简历定制', feature: 'JD关键词改写', key: 'resume_c2' },
    { need: '面试准备', feature: '按岗位面试题', key: 'interview_d1' },
    { need: '行业信息', feature: '行业动态简报', key: 'industry_brief_importance' },
  ],
  C: [
    { need: '投递效率', feature: '自动搜索岗位', key: 'automation_e3' },
    { need: '失败归因', feature: '拒信原因分类', key: 'dashboard_f3' },
    { need: 'Offer决策', feature: '多 Offer 对比', key: 'offer_g3' },
  ],
};

function DemandFlow({ rows, activeBranches }: { rows: Respondent[]; activeBranches: BranchCode[] }) {
  const height = activeBranches.length === 3 ? 420 : 170;
  const branchNodes: { code: BranchCode; label: string; n: number; y: number }[] = [];
  const needNodes: { code: BranchCode; need: string; y: number; count: number }[] = [];
  const featureNodes: { code: BranchCode; label: string; y: number; count: number }[] = [];
  let cursor = 18;
  for (const branch of activeBranches) {
    const branchRows = rows.filter((row) => row.branch === branch);
    const startY = cursor;
    for (const template of FLOW_TEMPLATES[branch]) {
      const count = branchRows.filter((row) => (numberValue(row, template.key) ?? 0) >= 4).length;
      needNodes.push({ code: branch, need: template.need, y: cursor, count });
      featureNodes.push({ code: branch, label: template.feature, y: cursor, count });
      cursor += 44;
    }
    branchNodes.push({ code: branch, label: DATA.branches.find((item) => item.code === branch)?.label ?? branch, n: branchRows.length, y: (startY + cursor - 44) / 2 - 16 });
    cursor += 12;
  }
  const link = (x1: number, y1: number, x2: number, y2: number, width: number, color: string, opacity = 0.28) => (
    <path d={`M ${x1} ${y1} C ${x1 + 70} ${y1}, ${x2 - 70} ${y2}, ${x2} ${y2}`} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={Math.max(2, Math.min(12, Math.sqrt(Math.max(width, 1)) * 2.2))} />
  );
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <svg viewBox={`0 0 650 ${height}`} className="h-full min-w-[500px] w-full" role="img" aria-label="用户类型到核心需求再到功能偏好的桑基图">
        <title>用户类型、核心需求与功能偏好链路</title>
        <desc>连线粗细表示对应分支中该项功能评分达到4分或5分的人数。</desc>
        {needNodes.map((node) => {
          const branchNode = branchNodes.find((item) => item.code === node.code)!;
          return <g key={`${node.code}-${node.need}-b`}>{link(104, branchNode.y + 16, 190, node.y + 16, branchNode.n, BRANCH_COLORS[node.code], 0.24)}</g>;
        })}
        {needNodes.map((node) => <g key={`${node.code}-${node.need}-f`}>{link(344, node.y + 16, 420, node.y + 16, node.count, BRANCH_COLORS[node.code], 0.4)}</g>)}
        {branchNodes.map((node) => (
          <g key={node.code}>
            <rect x="8" y={node.y} width="96" height="32" rx="8" fill={`${BRANCH_COLORS[node.code]}22`} stroke={`${BRANCH_COLORS[node.code]}88`} />
            <text x="56" y={node.y + 13} fill="#e2e8f0" fontSize="10" textAnchor="middle">{node.label}</text>
            <text x="56" y={node.y + 25} fill={BRANCH_COLORS[node.code]} fontSize="10" textAnchor="middle">n={node.n}</text>
          </g>
        ))}
        {needNodes.map((node) => (
          <g key={`${node.code}-${node.need}-node`}>
            <rect x="190" y={node.y} width="154" height="32" rx="7" fill="#0f2239" stroke="rgba(255,255,255,.12)" />
            <text x="267" y={node.y + 14} fill="#cbd5e1" fontSize="10" textAnchor="middle">{node.need}</text>
            <text x="267" y={node.y + 25} fill={BRANCH_COLORS[node.code]} fontSize="9" textAnchor="middle">高分需求 {node.count} 人</text>
          </g>
        ))}
        {featureNodes.map((node) => (
          <g key={`${node.code}-${node.label}-node`}>
            <rect x="420" y={node.y} width="210" height="32" rx="7" fill={`${BRANCH_COLORS[node.code]}14`} stroke={`${BRANCH_COLORS[node.code]}55`} />
            <text x="525" y={node.y + 14} fill="#e2e8f0" fontSize="10" textAnchor="middle">{node.label}</text>
            <text x="525" y={node.y + 25} fill="#94a3b8" fontSize="9" textAnchor="middle">评分≥4：{node.count} 人</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function InsightDashboard() {
  const [branch, setBranch] = useState<BranchFilter>('ALL');
  const [school, setSchool] = useState(ALL);
  const [major, setMajor] = useState(ALL);
  const [urgency, setUrgency] = useState(ALL);
  const [tab, setTab] = useState<'overview' | 'needs' | 'trust'>('overview');
  const activeBranches: BranchCode[] = branch === 'ALL' ? ['A', 'B', 'C'] : [branch];
  const filtered = useMemo(() => DATA.respondents.filter((row) => matchesFilter(row, branch, school, major, urgency)), [branch, school, major, urgency]);
  const featureStats = useMemo(() => buildFeatureStats(filtered, activeBranches), [filtered, activeBranches]);
  const highDemand = featureStats.filter((item) => item.mean >= 3.5).length;
  const cRows = filtered.filter((row) => row.branch === 'C');
  const aiUsers = cRows.filter((row) => (row.ai_tool_experience ?? '').startsWith('用过')).length;
  const aiUsePct = percent(aiUsers, cRows.length);
  const A_ROWS = filtered.filter((row) => row.branch === 'A');
  const B_ROWS = filtered.filter((row) => row.branch === 'B');
  const allPains = new Map<string, number>();
  for (const row of A_ROWS) for (const pain of row.pain_points ?? []) allPains.set(pain, (allPains.get(pain) ?? 0) + 1);
  const painRows = [...allPains.entries()].map(([label, count]) => ({ label, count, pct: percent(count, A_ROWS.length) })).sort((a, b) => b.count - a.count).slice(0, 7);
  const topFeatures = [...featureStats].sort((a, b) => b.mean - a.mean || b.high - a.high).slice(0, 8);
  const scatterRows = [...featureStats].sort((a, b) => b.mean - a.mean || b.high - a.high).slice(0, 18);
  const paymentOrder = ['必须免费', '< 30 元/月', '30-60 元/月', '60-100 元/月', '100+ 元/月', '一次性买断'];
  const paymentRows = paymentOrder.map((budget) => ({
    budget,
    A: A_ROWS.filter((row) => String(row.learning_payment ?? '').replace('（不订阅）', '').includes(budget)).length,
    B: B_ROWS.filter((row) => String(row.job_payment ?? '').replace('（不订阅）', '').includes(budget)).length,
  }));
  const privacyOrder = ['必须本地（不上云）', '希望可本地', '混合（敏感本地，普通云端）', '云端可以接受', '无所谓'];
  const privacyRows = privacyOrder.map((label) => {
    const count = cRows.filter((row) => row.privacy === label).length;
    return { label: label.replace('（不上云）', '').replace('（敏感本地，普通云端）', '/混合'), count, pct: percent(count, cRows.length) };
  });
  const aiRows = countBy(cRows, (row) => row.ai_tool_experience);
  const platformMap = new Map<string, number>();
  for (const row of B_ROWS) for (const item of row.platform_pref ?? []) platformMap.set(item, (platformMap.get(item) ?? 0) + 1);
  const platformRows = [...platformMap.entries()].map(([label, count]) => ({ label, count, pct: percent(count, B_ROWS.length) })).sort((a, b) => b.count - a.count).slice(0, 6);
  const schoolRows = [...new Set(filtered.map((row) => row.school_level))];
  const schoolMatrix = schoolRows.map((label) => ({ label, cells: activeBranches.map((code) => { const rows = filtered.filter((row) => row.school_level === label && row.branch === code); return { code, n: rows.length, mean: mean(rows.map((row) => row.primary_feature_mean).filter((value): value is number => value != null)) }; }) }));
  const visibleTests = DATA.tests.filter((test) => activeBranches.includes(test.branch));
  const branchInsights = DATA.branches.filter((item) => activeBranches.includes(item.code)).map((item) => ({ ...item, top: featureStats.filter((feature) => feature.branch === item.code).sort((a, b) => b.mean - a.mean).slice(0, 2) }));
  const reset = () => { setBranch('ALL'); setSchool(ALL); setMajor(ALL); setUrgency(ALL); setTab('overview'); };
  const enterFullscreen = async () => { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); };

  return (
    <main className="min-h-screen bg-[#F3EBDD] px-4 py-3 text-[#2B241D] sm:px-6 xl:h-screen xl:overflow-hidden" style={{ backgroundImage: 'radial-gradient(900px 520px at 88% -10%, rgba(196,138,44,.16), transparent 62%), radial-gradient(760px 480px at -8% 110%, rgba(47,107,94,.12), transparent 58%)' }}>
      <div className="mx-auto flex h-full max-w-[1920px] flex-col gap-3">
        <header className="flex shrink-0 flex-col gap-3 rounded-2xl border border-[#E1CFB6] bg-[#FFF9F0]/95 px-5 py-3 shadow-[0_18px_45px_-32px_rgba(77,54,35,.38)] lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#C45132]"><Sparkles className="h-4 w-4" /> SURVEY INTELLIGENCE / 174 RESPONSES</div>
            <h1 className="font-serif text-2xl font-bold leading-tight tracking-tight text-[#2B241D] py-0.5 lg:text-3xl">{DATA.meta.title}</h1>
            <p className="mt-1 truncate text-sm text-[#77695B]">{DATA.meta.subtitle} · {DATA.meta.note}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#B8D2C6] bg-[#E7F0EA] px-4 py-1.5 text-xs font-medium text-[#2F6B5E]">当前 {filtered.length} 份 · 数据已加载</span>
            <button onClick={enterFullscreen} className="flex items-center gap-2 rounded-full border border-[#D9C7AE] bg-white/60 px-4 py-1.5 text-xs font-medium text-[#4F4337] transition hover:bg-white"><Maximize2 className="h-4 w-4" />全屏</button>
            <button onClick={reset} className="flex items-center gap-2 rounded-full border border-[#D9C7AE] bg-white/60 px-4 py-1.5 text-xs font-medium text-[#4F4337] transition hover:bg-white"><RotateCcw className="h-4 w-4" />重置</button>
          </div>
        </header>

        <section className="grid shrink-0 gap-3 rounded-2xl border border-[#E1CFB6] bg-[#FFF9F0]/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-[#77695B]">用户类型<select value={branch} onChange={(event) => setBranch(event.target.value as BranchFilter)} className="mt-1 w-full rounded-xl border border-[#D9C7AE] bg-[#FFFDF8] px-3 py-2 text-sm text-[#2B241D] outline-none focus:border-[#C45132]"><option value="ALL">全部用户</option><option value="A">A · 学习成长型</option><option value="B">B · 求职准备型</option><option value="C">C · 紧急求职型</option></select></label>
          <label className="text-xs font-medium text-[#77695B]">学校层次<select value={school} onChange={(event) => setSchool(event.target.value)} className="mt-1 w-full rounded-xl border border-[#D9C7AE] bg-[#FFFDF8] px-3 py-2 text-sm text-[#2B241D] outline-none focus:border-[#C45132]"><option value={ALL}>全部层次</option>{DATA.school.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
          <label className="text-xs font-medium text-[#77695B]">专业类别<select value={major} onChange={(event) => setMajor(event.target.value)} className="mt-1 w-full rounded-xl border border-[#D9C7AE] bg-[#FFFDF8] px-3 py-2 text-sm text-[#2B241D] outline-none focus:border-[#C45132]"><option value={ALL}>全部专业</option>{DATA.major.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
          <label className="text-xs font-medium text-[#77695B]">求职紧迫度 <span className="text-[#A99A89]">(C分支)</span><select value={urgency} onChange={(event) => setUrgency(event.target.value)} className="mt-1 w-full rounded-xl border border-[#D9C7AE] bg-[#FFFDF8] px-3 py-2 text-sm text-[#2B241D] outline-none focus:border-[#C45132]"><option value={ALL}>全部紧迫度</option><option value="3 个月内（非常急）">3 个月内</option><option value="3-6 个月（半年内）">3-6 个月</option><option value="6-12 个月（一年内）">6-12 个月</option><option value="不急但想多投">不急但想多投</option></select></label>
        </section>

        <section className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#E1CFB6] bg-[#FFF9F0]/80 p-1.5">
          {[
            ['overview', '用户画像'],
            ['needs', '需求与功能'],
            ['trust', '付费与信任'],
          ].map(([key, label]) => <button key={key} onClick={() => setTab(key as 'overview' | 'needs' | 'trust')} className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === key ? 'bg-[#C45132] text-white shadow-[0_10px_24px_-16px_rgba(196,81,50,.8)]' : 'text-[#77695B] hover:bg-[#F2E4D2]'}`}>{label}</button>)}
        </section>

        {filtered.length === 0 ? (
          <div className={`${CARD} flex min-h-[320px] items-center justify-center text-sm text-[#77695B]`}>当前筛选组合没有有效样本，请重置筛选条件。</div>
        ) : (
          <>
            <section className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                ['当前样本', filtered.length, '有效答卷', 'text-[#2B241D]'],
                ['学习成长型', filtered.filter((row) => row.branch === 'A').length, 'A 分支', 'text-[#2F6B5E]'],
                ['求职准备型', filtered.filter((row) => row.branch === 'B').length, 'B 分支', 'text-[#C48A2C]'],
                ['紧急求职型', filtered.filter((row) => row.branch === 'C').length, 'C 分支', 'text-[#B94E36]'],
                ['高需求功能', highDemand, '均分≥3.5', 'text-[#2F6B5E]'],
                ['AI工具使用率', `${aiUsePct}%`, 'C分支样本', 'text-[#C48A2C]'],
              ].map(([label, value, hint, color]) => (
                <div key={label} className={`${CARD} px-4 py-3`}>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="mt-1 text-sm font-medium text-[#4F4337]">{label}</div>
                  <div className="text-xs text-[#A99A89]">{hint}</div>
                </div>
              ))}
            </section>

            {tab === 'overview' && (
              <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-12 xl:grid-rows-2">
                <ChartCard title="用户分层" subtitle="三类用户样本结构与占比" className="xl:col-span-4">
                  <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={DATA.branches.filter((item) => activeBranches.includes(item.code)).map((item) => ({ ...item, value: filtered.filter((row) => row.branch === item.code).length }))} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="46%" outerRadius="74%" paddingAngle={3} stroke="none">{DATA.branches.filter((item) => activeBranches.includes(item.code)).map((item) => <Cell key={item.code} fill={BRANCH_COLORS[item.code]} />)}</Pie><ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${Number(value)} 人`, '样本']} /><Legend wrapperStyle={{ color: AXIS_COLOR, fontSize: 12 }} /></PieChart></ResponsiveContainer></div>
                </ChartCard>

                <ChartCard title="样本构成" subtitle={`当前 n=${filtered.length}；身份分布`} className="xl:col-span-8">
                  <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={countBy(filtered, (row) => String(row.identity ?? '')).slice(0, 7)} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}><CartesianGrid stroke={GRID_COLOR} horizontal={false} /><XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 12 }} /><YAxis type="category" dataKey="label" width={116} tick={{ fill: AXIS_COLOR, fontSize: 12 }} /><ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${Number(value)} 人`, '样本']} /><Bar dataKey="count" radius={[0, 7, 7, 0]} fill="#3C7A89" /></BarChart></ResponsiveContainer></div>
                </ChartCard>

                <ChartCard title="分支画像" subtitle="分支内功能主题均分；题项不同，不作跨分支显著性比较" className="xl:col-span-7">
                  <div className={activeBranches.length === 1 ? 'grid min-h-0 flex-1' : 'grid min-h-0 flex-1 grid-cols-3 gap-2'}>{activeBranches.map((code) => <PersonaRadar key={code} branch={code} rows={filtered} />)}</div>
                </ChartCard>

                <ChartCard title="学习成长型痛点" subtitle={branch === 'B' || branch === 'C' ? '该题仅 A 分支作答' : `A分支 n=${A_ROWS.length}；多选题拆分`} className="xl:col-span-5">
                  {painRows.length ? <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={painRows} layout="vertical" margin={{ left: 8, right: 28, top: 6, bottom: 6 }}><CartesianGrid stroke={GRID_COLOR} horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={{ fill: AXIS_COLOR, fontSize: 12 }} unit="%" /><YAxis type="category" dataKey="label" width={146} tick={{ fill: AXIS_COLOR, fontSize: 12 }} /><ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${Number(value)}%`, '选择比例']} /><Bar dataKey="pct" radius={[0, 7, 7, 0]} fill="#2F6B5E" /></BarChart></ResponsiveContainer></div> : <EmptyChart text="B、C 分支未回答同一道痛点多选题。" />}
                </ChartCard>
              </section>
            )}

            {tab === 'needs' && (
              <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-12 xl:grid-rows-2">
                <ChartCard title="功能优先级气泡图" subtitle="横轴均分，纵轴评分≥4比例，气泡大小表示高分需求占比" className="xl:col-span-7">
                  <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 10, right: 20, bottom: 8, left: 4 }}><CartesianGrid stroke={GRID_COLOR} /><XAxis type="number" dataKey="mean" domain={[1, 5]} tick={{ fill: AXIS_COLOR, fontSize: 12 }} name="均分" /><YAxis type="number" dataKey="high" domain={[0, 100]} tick={{ fill: AXIS_COLOR, fontSize: 12 }} unit="%" name="高分占比" /><ZAxis type="number" dataKey="high" range={[70, 260]} /><ReTooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [String(name) === '均分' ? Number(value).toFixed(2) : `${Number(value)}%`, String(name)]} /><Legend wrapperStyle={{ color: AXIS_COLOR, fontSize: 12 }} />{activeBranches.map((code) => <Scatter key={code} name={DATA.branches.find((item) => item.code === code)?.label} data={scatterRows.filter((item) => item.branch === code)} fill={BRANCH_COLORS[code]} fillOpacity={0.78} />)}</ScatterChart></ResponsiveContainer></div>
                </ChartCard>

                <ChartCard title="需求链路" subtitle="用户类型 → 核心需求 → 功能偏好；连线粗细表示评分≥4人数" className="xl:col-span-5">
                  <DemandFlow rows={filtered} activeBranches={activeBranches} />
                </ChartCard>

                <ChartCard title="功能评分排行" subtitle={branch === 'ALL' ? '跨分支均分前8项，仅作结构对照' : `当前分支均分前8项 · n=${filtered.length}`} className="xl:col-span-7">
                  <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={topFeatures} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}><CartesianGrid stroke={GRID_COLOR} horizontal={false} /><XAxis type="number" domain={[1, 5]} tick={{ fill: AXIS_COLOR, fontSize: 12 }} /><YAxis type="category" dataKey="label" width={148} tick={{ fill: AXIS_COLOR, fontSize: 12 }} /><ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [Number(value).toFixed(2), '均分']} /><Bar dataKey="mean" radius={[0, 7, 7, 0]}>{topFeatures.map((item) => <Cell key={`${item.branch}-${item.key}`} fill={BRANCH_COLORS[item.branch]} />)}</Bar></BarChart></ResponsiveContainer></div>
                </ChartCard>

                <ChartCard title="学校层次 × 分支矩阵" subtitle="单元格为分支内主要功能均分与样本数；仅作描述" className="xl:col-span-5">
                  <div className="min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[430px] border-separate border-spacing-1 text-center text-xs"><thead><tr><th className="px-2 py-2 text-left text-[#A99A89]">学校层次</th>{activeBranches.map((code) => <th key={code} className="px-2 py-2" style={{ color: BRANCH_COLORS[code] }}>{code} · {DATA.branches.find((item) => item.code === code)?.label}</th>)}</tr></thead><tbody>{schoolMatrix.map((row) => <tr key={row.label}><th className="whitespace-nowrap px-2 py-2 text-left font-medium text-[#4F4337]">{row.label}</th>{row.cells.map((cell) => { const alpha = cell.mean == null ? 0.03 : Math.max(0.08, Math.min(0.35, (cell.mean - 1) / 4 * 0.35)); return <td key={cell.code} className="rounded-lg px-2 py-2" style={{ background: cell.mean == null ? 'rgba(80,60,42,.04)' : `${BRANCH_COLORS[cell.code]}${Math.round(alpha*255).toString(16).padStart(2,'0')}` }}><div className="text-sm font-semibold text-[#2B241D]">{cell.mean == null ? '—' : cell.mean.toFixed(2)}</div><div className="mt-1 text-[10px] text-[#77695B]">n={cell.n}</div></td>; })}</tr>)}</tbody></table></div>
                </ChartCard>
              </section>
            )}

            {tab === 'trust' && (
              <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-12 xl:grid-rows-2">
                <ChartCard title="付费预算" subtitle="A、B使用不同产品情境；C分支未询问付费" className="xl:col-span-5">
                  {A_ROWS.length || B_ROWS.length ? <div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><BarChart data={paymentRows} margin={{ top: 8, right: 12, bottom: 48, left: 4 }}><CartesianGrid stroke={GRID_COLOR} vertical={false} /><XAxis dataKey="budget" interval={0} angle={-20} textAnchor="end" height={60} tick={{ fill: AXIS_COLOR, fontSize: 10 }} /><YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} /><ReTooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [`${Number(value)} 人`, String(name) === 'A' ? '学习成长型' : '求职准备型']} /><Legend wrapperStyle={{ color: AXIS_COLOR, fontSize: 11 }} formatter={(value) => value === 'A' ? '学习成长型' : '求职准备型'} /><Bar dataKey="A" fill="#2F6B5E" radius={[5,5,0,0]} /><Bar dataKey="B" fill="#C48A2C" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div> : <EmptyChart text="当前筛选没有 A/B 付费数据。" />}
                </ChartCard>

                <ChartCard title="隐私、AI采用与平台偏好" subtitle={`C分支隐私 n=${cRows.length}；AI使用率 ${aiUsePct}%；B分支平台偏好`} className="xl:col-span-7">
                  {cRows.length || B_ROWS.length ? <div className="grid min-h-0 flex-1 grid-cols-2 gap-5 overflow-hidden"><div><div className="mb-2 text-xs font-semibold text-[#4F4337]">C分支隐私本地化偏好</div><div className="space-y-3">{privacyRows.map((row) => <div key={row.label}><div className="mb-1 flex justify-between text-xs text-[#77695B]"><span>{row.label}</span><span>{row.count}人 · {row.pct}%</span></div><div className="h-2 rounded-full bg-[#EDE2D2]"><div className="h-2 rounded-full bg-[#B94E36]" style={{ width: `${Math.max(2,row.pct)}%` }} /></div></div>)}</div><div className="mt-4 rounded-xl bg-[#F9E5DE] px-3 py-2 text-xs leading-5 text-[#8E3D2D]">本地或混合偏好合计83.3%。高焦虑并不自动带来高自动化接受度。</div></div><div><div className="mb-2 text-xs font-semibold text-[#4F4337]">AI工具经验与平台偏好</div><div className="grid grid-cols-2 gap-2">{aiRows.slice(0,4).map((row,index) => <div key={row.label} className="rounded-xl border border-[#E7D8C4] bg-white/50 p-2"><div className="text-xl font-bold" style={{ color: SCALE_COLORS[index % SCALE_COLORS.length] }}>{row.count}</div><div className="mt-1 text-[10px] leading-4 text-[#77695B]">{row.label.replace('用过 ', '').replace(' 等','')}</div></div>)}</div><div className="mt-4 space-y-2">{platformRows.slice(0,4).map((row) => <div key={row.label}><div className="mb-1 flex justify-between text-[11px] text-[#77695B]"><span>{row.label}</span><span>{row.pct}%</span></div><div className="h-1.5 rounded-full bg-[#EDE2D2]"><div className="h-1.5 rounded-full bg-[#C48A2C]" style={{ width: `${Math.max(2,row.pct)}%` }} /></div></div>)}</div></div></div> : <EmptyChart text="当前筛选没有 B/C 分支的平台或隐私数据。" />}
                </ChartCard>

                <ChartCard title="统计检验与核心结论" subtitle="探索性置换检验；小样本结果只用于发现线索" className="xl:col-span-12">
                  <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden lg:grid-cols-12">
                    <div className="lg:col-span-7"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[#E4D3BD] text-[#A99A89]"><th className="px-2 py-2">分支</th><th className="px-2 py-2">检验</th><th className="px-2 py-2">统计量</th><th className="px-2 py-2">p值</th><th className="px-2 py-2">n</th></tr></thead><tbody>{visibleTests.slice(0,6).map((test,index) => <tr key={`${test.branch}-${index}`} className="border-b border-[#EEE3D3] text-[#4F4337]"><td className="px-2 py-2 font-semibold" style={{ color: BRANCH_COLORS[test.branch] }}>{test.branch}</td><td className="px-2 py-2">{test.test}</td><td className="px-2 py-2">{test.H != null ? `H=${test.H}` : `ρ=${test.rho}`}</td><td className={`px-2 py-2 font-semibold ${test.p < 0.05 ? 'text-[#C45132]' : 'text-[#77695B]'}`}>{test.p}</td><td className="px-2 py-2">{test.n}</td></tr>)}</tbody></table></div>
                    <div className="lg:col-span-5"><div className="mb-2 text-xs font-semibold text-[#4F4337]">可直接写进论文的结论</div><div className="grid gap-2 text-xs leading-5 text-[#5B4D40]"><div className="rounded-xl bg-[#E7F0EA] px-3 py-2"><Users className="mr-2 inline h-4 w-4 text-[#2F6B5E]" />A优先自适应学习路径与知识整理。</div><div className="rounded-xl bg-[#FBF0D9] px-3 py-2"><WalletCards className="mr-2 inline h-4 w-4 text-[#C48A2C]" />B付费意愿较高，但新增简历/面试功能需差异化。</div><div className="rounded-xl bg-[#F9E5DE] px-3 py-2"><ShieldCheck className="mr-2 inline h-4 w-4 text-[#B94E36]" />C应先解决信任与人工门控，再推进自动化。</div><div className="rounded-xl bg-[#F3ECE2] px-3 py-2">功能重要性与付费预算相关性接近0，不能按功能数量直接定价。</div></div></div>
                  </div>
                </ChartCard>
              </section>
            )}

            <footer className="flex shrink-0 items-center justify-between border-t border-[#DCC9B0] pt-1 text-[10px] text-[#A99A89]"><span>{DATA.meta.generated_at} · 174份问卷</span><span>口径：A=77，B=67，C=30；图表分母随筛选变化</span></footer>
          </>
        )}
      </div>
    </main>
  );
}
