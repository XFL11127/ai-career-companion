/**
 * 信息库 / 知识库数据层 — 资源库 / 用户贡献 / 笔记
 *
 * 统一模型 `InfoItem`（见 项目说明.md「信息库数据模型」一节）：
 *   kind: 岗位链接 / 学校信息 / 学习资源 / 政策 / 笔记
 *   visibility: public（审核后公开）/ private（仅自己，笔记）
 *   status: published / pending / rejected
 *
 * 存储：localStorage（免登即用草稿）。⚠️ 与 growth.ts 同模式——
 * Supabase 就绪后只需替换本文件读写实现（对外函数签名不变），页面无需改动。
 *
 * 合规红线（§4.3）：仅存链接与摘要，不抓取、不存储正文。
 */

export type InfoKind = 'job' | 'school' | 'learning' | 'policy' | 'note';
export type Visibility = 'public' | 'private';
export type ReviewStatus = 'pending' | 'needs_info' | 'published' | 'rejected';

export interface InfoItem {
  id: string;
  kind: InfoKind;
  visibility: Visibility;
  status: ReviewStatus;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  /** 来源站点（联网检索/资源库展示用） */
  sourceSite?: string;
  /** 分类：岗位 / 学习 / 政策 / 学校 */
  category?: string;
  ownerId?: string;
  ownerRole?: string;
  /** 系统资源库受保护（仅高校老师/系统维护员可改） */
  protected?: boolean;
  /** ---- 证据链字段（UC-B5 起）---- */
  company?: string;
  role?: string;
  /** 信号类型，见 packages/types 的 evidenceSignalSchema */
  signal?: string;
  /** 投稿人粘贴的原文摘录；无摘录不得通过审核 */
  quote?: string;
  /** A=官方原文 B=权威来源 C=用户投稿 */
  credibility?: 'A' | 'B' | 'C';
  reviewer?: string;
  reviewNote?: string;
  points?: number;
  createdAt: number;
  updatedAt: number;
}

const RESOURCES_KEY = 'infobase_resources';
const CONTRIBUTIONS_KEY = 'infobase_contributions';
const NOTES_KEY = 'infobase_notes';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readList<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: unknown[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* 隐私模式 / 配额超限时静默降级 */
  }
}

// ---------- 种子数据（演示用，标注 protected 的系统资源库）----------
// 仅在前端无数据时写入，便于验证「受保护」徽章与资源库空态之外的可见效果。
const SEED_RESOURCES: InfoItem[] = [
  {
    id: 'sys_job_1',
    kind: 'job',
    visibility: 'public',
    status: 'published',
    title: '腾讯校园招聘官方站',
    summary: '腾讯校招岗位、实习与官方解读，含各事业群招聘维度说明。',
    url: 'https://join.qq.com',
    tags: ['校招', '大厂', '官方来源'],
    sourceSite: 'join.qq.com',
    category: '岗位',
    protected: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'sys_school_1',
    kind: 'school',
    visibility: 'public',
    status: 'published',
    title: '全国普通高等学校学生就业服务网',
    summary: '教育部主管的官方就业信息源，含政策、双非友好岗位汇总。',
    url: 'https://www.ncss.cn',
    tags: ['政策', '官方', '就业'],
    sourceSite: 'ncss.cn',
    category: '政策',
    protected: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export function loadResources(): InfoItem[] {
  const list = readList<InfoItem>(RESOURCES_KEY);
  if (list.length === 0 && isBrowser() && !localStorage.getItem(RESOURCES_KEY)) {
    // 首次访问：写入系统资源库种子（受保护），用户贡献的公开展示在其后叠加
    writeList(RESOURCES_KEY, SEED_RESOURCES);
    return SEED_RESOURCES;
  }
  return list;
}

export function saveResource(item: InfoItem): void {
  const list = loadResources().filter((r) => r.id !== item.id);
  list.unshift({ ...item, updatedAt: Date.now() });
  writeList(RESOURCES_KEY, list);
}

// ---------- 用户贡献（UC-B5）----------
// 证据规则：投稿必须带「来源链接 + 原文摘录」才可能通过审核；
// 状态流转沿用 packages/types 的 CONTRIBUTION_TRANSITIONS（此处用 published 表示 approved）。

export interface ContributionInput {
  kind: InfoKind;
  title: string;
  url: string;
  summary: string;
  contact?: string;
  category?: string;
  company?: string;
  role?: string;
  signal?: string;
  quote?: string;
  ownerId?: string;
  ownerRole?: string;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** 提交一条贡献，默认 status=pending（需审核队列）。 */
export function addContribution(input: ContributionInput): InfoItem {
  const item: InfoItem = {
    id: uid(),
    kind: input.kind,
    visibility: 'public',
    status: 'pending',
    title: input.title.trim(),
    summary: input.summary.trim(),
    url: input.url.trim(),
    tags: input.quote && input.quote.trim().length >= 8 ? ['已附原文摘录'] : ['待补原文摘录'],
    category: input.category,
    company: input.company?.trim() || undefined,
    role: input.role?.trim() || undefined,
    signal: input.signal,
    quote: input.quote?.trim() || undefined,
    ownerId: input.ownerId,
    ownerRole: input.ownerRole,
    points: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const list = readList<InfoItem>(CONTRIBUTIONS_KEY);
  list.unshift(item);
  writeList(CONTRIBUTIONS_KEY, list);
  return item;
}

export function loadContributions(): InfoItem[] {
  return readList<InfoItem>(CONTRIBUTIONS_KEY);
}

export interface ReviewOptions {
  credibility?: 'A' | 'B' | 'C';
  reviewer?: string;
  reviewNote?: string;
  /** 审核通过时给贡献者记分 */
  ownerId?: string;
}

export interface ReviewOutcome {
  ok: boolean;
  item?: InfoItem;
  error?: string;
}

const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  pending: ['published', 'rejected', 'needs_info'],
  needs_info: ['pending', 'rejected'],
  published: [],
  rejected: ['pending'],
};

/** 积分：与 packages/types 的 CONTRIBUTION_POINTS 保持一致 */
const POINTS_BY_CREDIBILITY: Record<'A' | 'B' | 'C', number> = { A: 30, B: 20, C: 10 };

/**
 * 审核（本地兜底实现）。规则与数据库层一致：
 * 1) 只允许约定内的状态流转；
 * 2) 置为 published 必须有 ≥8 字原文摘录，否则拒绝。
 */
export function reviewContribution(
  id: string,
  decision: ReviewStatus,
  options: ReviewOptions = {}
): ReviewOutcome {
  const list = loadContributions();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, error: '贡献不存在' };

  const current = list[idx];
  const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(decision)) {
    return { ok: false, error: `不允许的状态流转：${current.status} → ${decision}` };
  }

  const quote = (current.quote ?? '').trim();
  if (decision === 'published') {
    if (!isHttpUrl(current.url)) return { ok: false, error: '来源链接必须是 http(s) 地址' };
    if (quote.length < 8) {
      return {
        ok: false,
        error: '该贡献没有原文摘录，不能通过审核。请驳回或标记为「待补充证据」。',
      };
    }
  }

  const credibility = options.credibility ?? current.credibility ?? 'C';
  const updated: InfoItem = {
    ...current,
    status: decision,
    credibility: decision === 'published' ? credibility : current.credibility,
    reviewer: options.reviewer ?? current.reviewer,
    reviewNote: options.reviewNote ?? current.reviewNote,
    points: decision === 'published' ? POINTS_BY_CREDIBILITY[credibility] : 0,
    updatedAt: Date.now(),
  };
  list[idx] = updated;
  writeList(CONTRIBUTIONS_KEY, list);
  return { ok: true, item: updated };
}

// ---------- 我的笔记（private）----------
export interface NoteInput {
  title: string;
  summary: string;
}

export function loadNotes(ownerId?: string): InfoItem[] {
  return readList<InfoItem>(NOTES_KEY).filter(
    (n) => n.kind === 'note' && (!ownerId || n.ownerId === ownerId)
  );
}

export function saveNote(input: NoteInput, ownerId?: string, existingId?: string): InfoItem {
  const list = readList<InfoItem>(NOTES_KEY);
  const item: InfoItem = {
    id: existingId ?? uid(),
    kind: 'note',
    visibility: 'private',
    status: 'published',
    title: input.title.trim() || '未命名笔记',
    summary: input.summary.trim(),
    url: '',
    tags: [],
    ownerId,
    createdAt: existingId
      ? (list.find((n) => n.id === existingId)?.createdAt ?? Date.now())
      : Date.now(),
    updatedAt: Date.now(),
  };
  const next = list.filter((n) => n.id !== item.id);
  next.unshift(item);
  writeList(NOTES_KEY, next);
  return item;
}

export function deleteNote(id: string): void {
  writeList(
    NOTES_KEY,
    readList<InfoItem>(NOTES_KEY).filter((n) => n.id !== id)
  );
}

// ---------- 联网检索 demo stub（§4.2 来源卡片，不接真实 Key）----------
export interface SourceCardData {
  title: string;
  url: string;
  summary: string;
  sourceSite: string;
  datePublished?: string;
}

/**
 * 返回示例来源卡片，仅用于前端演示 SourceCard 渲染（标注「示例」）。
 * 真实检索待接入 Worker + 博查/DeepSeek 联网（见 项目说明.md 资源库调用技术线）。
 */
export function demoSearch(query: string): SourceCardData[] {
  const q = query.trim();
  if (!q) return [];
  return [
    {
      title: `${q} · 官方校招说明（示例）`,
      url: 'https://join.qq.com',
      summary: `这是「${q}」的示例检索结果，用于演示来源卡片渲染。真实结果需接入联网检索 Key。`,
      sourceSite: 'join.qq.com',
      datePublished: new Date().toISOString().slice(0, 10),
    },
    {
      title: `${q} · 双非友好岗位汇总（示例）`,
      url: 'https://www.ncss.cn',
      summary: `示例：聚合展示与「${q}」相关的双非友好岗位与政策信息。`,
      sourceSite: 'ncss.cn',
      datePublished: new Date().toISOString().slice(0, 10),
    },
  ];
}
