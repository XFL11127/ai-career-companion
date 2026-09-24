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

// ---------- Skill 3：信息差填平（校招信息聚合）----------

export const jobPostingSchema = z.object({
  company: z.string(),
  role: z.string(),
  salary: z.string(),
  location: z.string(),
  tags: z.array(z.string()),
  url: z.string().url(),
  doubleNonFriendly: z.boolean().default(true), // 双非友好
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
