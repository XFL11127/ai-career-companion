import { z } from 'zod';

/**
 * AI学职同伴 — 共享契约层（单一事实来源）
 * Web(apps/web) 与 Worker(apps/worker) 双端 import 本包，避免类型漂移。
 * 领域模型对齐参赛方案 v3.6：面向双非学生的 AI Copilot 式学职陪伴 App。
 */

// ---------- 基础结构 ----------

export const skillNameSchema = z.enum([
  'diagnose',
  'plan',
  'practice',
  'info',
  'package',
  'resume',
  'interview',
  'match',
  'course',
  'assessment',
]);
export type SkillName = z.infer<typeof skillNameSchema>;

export const apiErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  detail: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    list: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });
}
export type Paginated<T> = { list: T[]; total: number; page: number; pageSize: number };

// ---------- 用户画像（双非学生）----------

export const profileSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  school: z.string(), // 双非院校
  grade: z.enum(['大一', '大二', '大三', '大四']),
  major: z.string(),
  targetRole: z.string(), // 目标岗位
  goals: z.array(z.string()),
  streakDays: z.number().default(0), // 连续打卡天数
  createdAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

// ---------- 记忆层（Supabase + pgvector，三层）----------

// L1 感知 / L2 交互 / L3 知识 → 对应短期会话/中期本地/长期向量
export const memoryLayerSchema = z.enum(['perception', 'interaction', 'knowledge']);
export type MemoryLayer = z.infer<typeof memoryLayerSchema>;

export const memoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: z.string(),
  layer: memoryLayerSchema,
  embedding: z.array(z.number()).optional(), // pgvector 向量
  createdAt: z.string(),
});
export type MemoryItem = z.infer<typeof memoryItemSchema>;

/**
 * 浏览器可见的记忆条目。身份归属只在服务端处理，因此 DTO 中绝不能出现 userId 或 embedding。
 */
export const memoryViewSchema = z.object({
  id: z.string(),
  content: z.string(),
  layer: memoryLayerSchema,
  createdAt: z.string(),
  score: z.number().min(0).max(1).optional(),
});
export type MemoryView = z.infer<typeof memoryViewSchema>;

const boundedMemoryText = z.string().trim().min(1).max(8_000);

/** Browser → Next BFF. The authenticated user is derived by the BFF, never supplied by the client. */
export const memoryWriteRequestSchema = z.object({
  content: boundedMemoryText,
  layer: memoryLayerSchema.optional().default('interaction'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type MemoryWriteRequest = z.infer<typeof memoryWriteRequestSchema>;

/** Browser → Next BFF semantic-memory query. */
export const memorySearchRequestSchema = z.object({
  query: boundedMemoryText,
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
export type MemorySearchRequest = z.infer<typeof memorySearchRequestSchema>;

export const memorySearchResponseSchema = z.object({
  items: z.array(memoryViewSchema),
  mode: z.enum(['semantic', 'keyword']),
  degraded: z.boolean(),
  reason: z.string().optional(),
});
export type MemorySearchResponse = z.infer<typeof memorySearchResponseSchema>;

/** Next BFF → internal Worker only. Do not expose this request shape to the browser. */
export const embeddingRequestSchema = z.object({
  texts: z.array(boundedMemoryText).min(1).max(32),
});
export type EmbeddingRequest = z.infer<typeof embeddingRequestSchema>;

export const embeddingResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())).min(1),
  model: z.literal('@cf/baai/bge-m3'),
  degraded: z.literal(false),
});
export type EmbeddingResponse = z.infer<typeof embeddingResponseSchema>;

// ---------- Skill 0：破局诊断（五维差距扫描）----------

export const gapDimensionSchema = z.object({
  name: z.string(), // 维度名，如「技术栈」「实习经历」
  current: z.number(),
  target: z.number(),
  gap: z.number(),
});
export type GapDimension = z.infer<typeof gapDimensionSchema>;

export const roleMatchSchema = z.object({
  role: z.string(),
  matchScore: z.number(),
  reason: z.string(),
});
export type RoleMatch = z.infer<typeof roleMatchSchema>;

export const diagnoseInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4_000),
      })
    )
    .max(20)
    .optional(),
  // L1 会话记忆：召回的近期轮次摘要，注入 prompt 保持连贯
  context: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
  // L2 交互记忆：用户画像摘要，跨会话持久化
  profile: z.string().trim().max(4_000).optional(),
});
export const diagnoseOutputSchema = z.object({
  reply: z.string().optional(), // 散文式解读（Kimi 式对话感）
  radar: z.array(gapDimensionSchema), // 五维能力差距
  recommendedRoles: z.array(roleMatchSchema),
});
export type DiagnoseInput = z.infer<typeof diagnoseInputSchema>;
export type DiagnoseOutput = z.infer<typeof diagnoseOutputSchema>;

// ---------- Skill 1：路径规划（成长路径生成）----------

export const actionCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['study', 'project', 'apply', 'review']),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
});
export type ActionCard = z.infer<typeof actionCardSchema>;

export const milestoneSchema = z.object({
  dayRange: z.string(), // "0-30" / "31-60" / "61-90"
  title: z.string(),
  actions: z.array(actionCardSchema),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const planOutputSchema = z.object({
  reply: z.string().optional(),
  milestones: z.array(milestoneSchema),
});
export type PlanOutput = z.infer<typeof planOutputSchema>;

// 路径规划输入：既接受「诊断输出」（卡片页链路），也接受「自由文本目标」（聊天链路）
export const planInputSchema = diagnoseOutputSchema.partial().extend({
  goal: z.string().trim().min(1).max(2_000).optional(),
  context: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
  profile: z.string().trim().max(4_000).optional(),
});
export type PlanInput = z.infer<typeof planInputSchema>;

// ---------- Skill 2：实战练兵（项目推送/模拟面试）----------

export const practiceInputSchema = z.object({
  mode: z.enum(['interview', 'algorithm', 'project']).optional().default('interview'),
  topic: z.string().trim().min(1).max(2_000).optional(),
  // L1 会话记忆
  context: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
  // L2 交互记忆：用户画像摘要
  profile: z.string().trim().max(4_000).optional(),
});
export const practiceOutputSchema = z.object({
  reply: z.string().optional(),
  questions: z.array(z.string()),
  feedback: z.string().optional(),
});
export type PracticeInput = z.infer<typeof practiceInputSchema>;
export type PracticeOutput = z.infer<typeof practiceOutputSchema>;

// ---------- 信息中枢 · 证据链（Evidence Chain）----------
// 本层最重要的一条约束：任何「双非友好」标签都必须能追溯到一条可点击、可核对的原文证据。
// 没有原句 → 不允许出现该标签。标签由 deriveFriendlyLevel() 计算，不由模型断言。

export const evidenceSignalSchema = z.enum([
  'degree_barrier', // 学历门槛：公告明确「本科及以上」且未限定院校
  'school_list', // 院校要求：公告列出院校清单，或明确「不限院校」
  'bonus', // 加分项：明确「不限专业 / 项目经历优先 / 竞赛优先」
  'historical_admit', // 历史录取：往届录取名单、生源院校公示
  'policy', // 政策依据：禁止学历歧视的官方文件
  'deadline', // 时间窗口：报名 / 投递截止
]);
export type EvidenceSignal = z.infer<typeof evidenceSignalSchema>;

export const EVIDENCE_SIGNAL_LABEL: Record<EvidenceSignal, string> = {
  degree_barrier: '学历门槛',
  school_list: '院校要求',
  bonus: '加分项',
  historical_admit: '历史录取',
  policy: '政策依据',
  deadline: '时间窗口',
};

/** A=官方原文（企业/政府/高校官网）；B=权威平台且可回溯原文；C=UGC 投稿待复核 */
export const credibilitySchema = z.enum(['A', 'B', 'C']);
export type Credibility = z.infer<typeof credibilitySchema>;

export const CREDIBILITY_LABEL: Record<Credibility, string> = {
  A: 'A · 官方原文',
  B: 'B · 权威来源',
  C: 'C · 用户投稿',
};

/** 审核通过一条贡献可得的积分，按可信度分级 */
export const CONTRIBUTION_POINTS: Record<Credibility, number> = { A: 30, B: 20, C: 10 };

export const evidenceItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  signal: evidenceSignalSchema,
  /** positive = 支持「双非友好」的信号；negative = 限制性表述（如仅限 985/211），用于风险提示 */
  direction: z.enum(['positive', 'negative']).default('positive'),
  /** 原文摘录：必须逐字来自 sourceUrl 页面，供人工核对 */
  quote: z.string().trim().min(8),
  sourceUrl: z.string().url(),
  sourceSite: z.string(),
  publishedAt: z.string().optional(),
  fetchedAt: z.string(),
  credibility: credibilitySchema,
  /** 审核人标识；UGC 通过审核后写入 */
  reviewer: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('approved'),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const friendlyLevelSchema = z.enum(['verified', 'reachable', 'unverified']);
export type FriendlyLevel = z.infer<typeof friendlyLevelSchema>;

export const FRIENDLY_LEVEL_LABEL: Record<FriendlyLevel, string> = {
  verified: '双非友好 · 有据',
  reachable: '门槛可及 · 未见院校限制',
  unverified: '未见依据',
};

/**
 * 强证据信号：只有这些信号才足以支撑「双非友好」结论。
 * degree_barrier（如「本科及以上」）只说明门槛可及，不能单独断言不限院校。
 */
export const FRIENDLY_SIGNALS: readonly EvidenceSignal[] = [
  'policy',
  'bonus',
  'school_list',
  'historical_admit',
];

function isUsableEvidence(e: EvidenceItem): boolean {
  return (
    e.status === 'approved' &&
    e.direction !== 'negative' &&
    e.quote.trim().length >= 8 &&
    /^https?:\/\//i.test(e.sourceUrl)
  );
}

/**
 * 标签门禁：任何渲染路径都必须走这个函数，禁止直接信任数据里的标签字段。
 * verified = 有强证据；reachable = 仅有学历门槛证据；unverified = 无可用证据。
 */
export function deriveFriendlyLevel(evidence: readonly EvidenceItem[] = []): FriendlyLevel {
  const usable = evidence.filter(isUsableEvidence);
  if (usable.some((e) => FRIENDLY_SIGNALS.includes(e.signal))) return 'verified';
  if (usable.some((e) => e.signal === 'degree_barrier')) return 'reachable';
  return 'unverified';
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// ---------- 信息中枢 · 岗位与贡献 ----------

export const hubJobSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  salary: z.string(),
  location: z.string(),
  industry: z.string(),
  degree: z.string(),
  tags: z.array(z.string()),
  url: z.string().url(),
  description: z.string(),
  requirements: z.array(z.string()),
  deadline: z.string(),
  evidence: z.array(evidenceItemSchema).default([]),
});
export type HubJob = z.infer<typeof hubJobSchema>;

export const contributionKindSchema = z.enum([
  'job',
  'internship',
  'policy',
  'school',
  'resource',
  'interview_exp',
]);
export type ContributionKind = z.infer<typeof contributionKindSchema>;

export const contributionStatusSchema = z.enum(['pending', 'needs_info', 'approved', 'rejected']);
export type ContributionStatus = z.infer<typeof contributionStatusSchema>;

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
  pending: '待审核',
  needs_info: '待补充证据',
  approved: '已通过',
  rejected: '已驳回',
};

/** 审核状态机：只允许这些流转，服务端与前端共用，防止任意改状态 */
export const CONTRIBUTION_TRANSITIONS: Record<ContributionStatus, readonly ContributionStatus[]> = {
  pending: ['approved', 'rejected', 'needs_info'],
  needs_info: ['pending', 'rejected'],
  approved: [],
  rejected: ['pending'],
};

export function canTransitionContribution(
  from: ContributionStatus,
  to: ContributionStatus
): boolean {
  return CONTRIBUTION_TRANSITIONS[from].includes(to);
}

export const contributionSchema = z.object({
  id: z.string(),
  kind: contributionKindSchema,
  title: z.string().trim().min(1),
  summary: z.string().default(''),
  url: z.string(),
  company: z.string().optional(),
  role: z.string().optional(),
  signal: evidenceSignalSchema.optional(),
  /** 投稿人粘贴的原文摘录；无摘录不得通过审核 */
  quote: z.string().optional(),
  contact: z.string().optional(),
  status: contributionStatusSchema.default('pending'),
  credibility: credibilitySchema.optional(),
  reviewer: z.string().optional(),
  reviewNote: z.string().optional(),
  points: z.number().default(0),
  ownerId: z.string().optional(),
  ownerRole: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Contribution = z.infer<typeof contributionSchema>;

/** 限制性信号：出现即提示风险，且永远不能点亮「双非友好」 */
export function hasRestrictionEvidence(evidence: readonly EvidenceItem[] = []): boolean {
  return evidence.some((e) => e.direction === 'negative' && e.status === 'approved');
}

/** 贡献 → 证据：只有「审核通过 + 带原文摘录 + 合法链接」才能转成可展示证据 */
export function contributionToEvidence(c: Contribution): EvidenceItem | null {
  if (c.status !== 'approved') return null;
  const quote = (c.quote ?? '').trim();
  if (quote.length < 8) return null;
  if (!/^https?:\/\//i.test(c.url)) return null;
  return {
    id: c.id,
    company: c.company?.trim() || c.title,
    role: c.role?.trim() || c.kind,
    signal: c.signal ?? 'bonus',
    quote,
    sourceUrl: c.url,
    sourceSite: safeHostname(c.url),
    fetchedAt: c.updatedAt,
    credibility: c.credibility ?? 'C',
    reviewer: c.reviewer,
    direction: 'positive',
    status: 'approved',
  };
}

// ---------- Skill 3：信息差填平（校招信息聚合）----------
// 注意：模型输出的 job 只允许携带「原文摘录 + 来源」，不允许自带「双非友好」布尔标签。
// 标签一律由 deriveFriendlyLevel() 依据 evidence 计算。

export const jobPostingSchema = z.object({
  company: z.string(),
  role: z.string(),
  salary: z.string(),
  location: z.string(),
  tags: z.array(z.string()),
  url: z.string().url(),
  sourceSite: z.string().optional(),
  publishedAt: z.string().optional(),
  /** 原文摘录：必须逐字来自 url 页面；缺失即视为未验证，前端不显示「双非友好」 */
  evidenceQuote: z.string().optional(),
  signal: evidenceSignalSchema.optional(),
});
export type JobPosting = z.infer<typeof jobPostingSchema>;

export const infoOutputSchema = z.object({
  reply: z.string().optional(),
  jobs: z.array(jobPostingSchema),
});
export type InfoOutput = z.infer<typeof infoOutputSchema>;

// ---------- Skill 4：成果包装（简历/面试材料转化）----------

export const packageInputSchema = z.object({
  resumeText: z.string().trim().min(1).max(12_000).optional(),
  targetRole: z.string().trim().min(1).max(2_000).optional(),
  // L1 会话记忆
  context: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
  // L2 交互记忆：用户画像摘要
  profile: z.string().trim().max(4_000).optional(),
});
export const packageOutputSchema = z.object({
  reply: z.string().optional(),
  optimizedResume: z.string(),
  projectBullets: z.array(z.string()),
  interviewReview: z.string().optional(),
});
export type PackageInput = z.infer<typeof packageInputSchema>;
export type PackageOutput = z.infer<typeof packageOutputSchema>;

// ---------- MVP M1：智能简历工坊 ----------

export const resumeDimensionSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  comment: z.string(),
});
export const resumeRewriteSchema = z.object({
  section: z.string(),
  before: z.string(),
  after: z.string(),
  reason: z.string(),
});
export const resumeInputSchema = z.object({
  resumeText: z.string().min(1),
  targetRole: z.string().min(1),
  jobDescription: z.string().optional(),
  context: z.array(z.string()).optional(),
  profile: z.string().optional(),
});
export const resumeOutputSchema = z.object({
  reply: z.string().optional(),
  overallScore: z.number().min(0).max(100),
  atsScore: z.number().min(0).max(100),
  dimensions: z.array(resumeDimensionSchema),
  missingKeywords: z.array(z.string()),
  strengths: z.array(z.string()),
  rewriteSuggestions: z.array(resumeRewriteSchema),
  optimizedResume: z.string(),
  projectBullets: z.array(z.string()),
  nextActions: z.array(z.string()),
});
export type ResumeInput = z.infer<typeof resumeInputSchema>;
export type ResumeOutput = z.infer<typeof resumeOutputSchema>;

// ---------- MVP M2：模拟面试舱 ----------

export const interviewQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(['自我介绍', '技术', '项目', '行为', '反问']),
  question: z.string(),
  intention: z.string(),
  starHint: z.string(),
  sampleAnswer: z.string(),
});
export const interviewScoreSchema = z.object({
  clarity: z.number().min(0).max(100),
  structure: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  depth: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  feedback: z.string(),
});
export const interviewInputSchema = z.object({
  targetRole: z.string().min(1),
  resumeText: z.string().optional(),
  jobDescription: z.string().optional(),
  mode: z.enum(['technical', 'behavioral', 'mixed']).optional().default('mixed'),
  language: z.enum(['zh', 'en', 'bilingual']).optional().default('zh'),
  priorAnswers: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  context: z.array(z.string()).optional(),
  profile: z.string().optional(),
});
export const interviewOutputSchema = z.object({
  reply: z.string().optional(),
  questions: z.array(interviewQuestionSchema),
  scoreCard: interviewScoreSchema.optional(),
  followUps: z.array(z.string()),
  improvementPlan: z.array(z.string()),
});
export type InterviewInput = z.infer<typeof interviewInputSchema>;
export type InterviewOutput = z.infer<typeof interviewOutputSchema>;

// ---------- MVP M3：岗位匹配雷达 ----------

export const matchDimensionSchema = z.object({
  key: z.enum(['skills', 'experience', 'location', 'industry', 'trajectory']),
  name: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  reason: z.string(),
});
export const matchOutputSchema = z.object({
  reply: z.string().optional(),
  overallScore: z.number().min(0).max(100),
  recommendation: z.enum(['recommend', 'caution', 'avoid']),
  summary: z.string(),
  dimensions: z.array(matchDimensionSchema),
  strengths: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  risks: z.array(z.string()),
  actions: z.array(z.string()),
});
export const matchInputSchema = z.object({
  resumeText: z.string().min(1),
  jobDescription: z.string().min(1),
  targetLocation: z.string().optional(),
  targetIndustry: z.string().optional(),
  careerGoal: z.string().optional(),
  context: z.array(z.string()).optional(),
  profile: z.string().optional(),
});
export type MatchInput = z.infer<typeof matchInputSchema>;
export type MatchOutput = z.infer<typeof matchOutputSchema>;

// ---------- MVP M4：课程学习助手 ----------

export const courseConceptSchema = z.object({
  term: z.string(),
  explanation: z.string(),
  example: z.string(),
  whyItMatters: z.string(),
});
export const flashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  tags: z.array(z.string()),
});
export const quizQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['single', 'short-answer']),
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  explanation: z.string(),
});
export const studyPlanSchema = z.object({
  dayRange: z.string(),
  goal: z.string(),
  tasks: z.array(z.string()),
});
export const courseOutputSchema = z.object({
  reply: z.string().optional(),
  summary: z.string(),
  concepts: z.array(courseConceptSchema),
  flashcards: z.array(flashcardSchema),
  quiz: z.array(quizQuestionSchema),
  studyPlan: z.array(studyPlanSchema),
  misconceptions: z.array(z.string()),
});
export const courseInputSchema = z.object({
  materialText: z.string().min(1),
  materialName: z.string().optional(),
  goal: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
  context: z.array(z.string()).optional(),
  profile: z.string().optional(),
});
export type CourseInput = z.infer<typeof courseInputSchema>;
export type CourseOutput = z.infer<typeof courseOutputSchema>;

// ---------- MVP M5：自我认知测评 ----------

export const assessmentDimensionSchema = z.object({
  key: z.string(),
  name: z.string(),
  score: z.number().min(0).max(100),
  level: z.enum(['低', '中', '高']),
  description: z.string(),
});
export const careerDirectionSchema = z.object({
  role: z.string(),
  fitScore: z.number().min(0).max(100),
  reason: z.string(),
  nextStep: z.string(),
});
export const assessmentInputSchema = z.object({
  answers: z.record(z.string(), z.number().min(1).max(5)),
  targetRole: z.string().optional(),
  context: z.array(z.string()).optional(),
  profile: z.string().optional(),
});
export const assessmentOutputSchema = z.object({
  reply: z.string().optional(),
  profileTitle: z.string(),
  profileCode: z.string(),
  disclaimer: z.string(),
  dimensions: z.array(assessmentDimensionSchema),
  traits: z.array(z.string()),
  strengths: z.array(z.string()),
  growthAreas: z.array(z.string()),
  recommendedCareers: z.array(careerDirectionSchema),
  actionPlan: z.array(z.string()),
});
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

// ---------- 统一 Skill 输入/输出映射（Worker 路由与 Web 共用）----------

export const skillInputMap = {
  diagnose: diagnoseInputSchema,
  plan: planInputSchema,
  practice: practiceInputSchema,
  info: z.object({
    context: z.array(z.string().trim().min(1).max(2_000)).max(10).optional(),
    profile: z.string().trim().max(4_000).optional(),
  }),
  package: packageInputSchema,
  resume: resumeInputSchema,
  interview: interviewInputSchema,
  match: matchInputSchema,
  course: courseInputSchema,
  assessment: assessmentInputSchema,
} as const;

export const skillOutputMap = {
  diagnose: diagnoseOutputSchema,
  plan: planOutputSchema,
  practice: practiceOutputSchema,
  info: infoOutputSchema,
  package: packageOutputSchema,
  resume: resumeOutputSchema,
  interview: interviewOutputSchema,
  match: matchOutputSchema,
  course: courseOutputSchema,
  assessment: assessmentOutputSchema,
} as const;

export type SkillInput<N extends SkillName> = z.infer<(typeof skillInputMap)[N]>;
export type SkillOutput<N extends SkillName> = z.infer<(typeof skillOutputMap)[N]>;

/** Every Skill response declares whether it is a real provider result or an explicit fallback. */
export const skillRunMetaSchema = z.object({
  provider: z.enum(['deepseek', 'stub']),
  degraded: z.boolean(),
  reason: z.enum(['missing_api_key', 'provider_error']).optional(),
});
export type SkillRunMeta = z.infer<typeof skillRunMetaSchema>;

// Worker 健康检查
export const healthSchema = z.object({
  status: z.literal('ok'),
  time: z.string(),
  components: z.object({ embedding: z.enum(['ready', 'unavailable']) }),
});
export type Health = z.infer<typeof healthSchema>;
