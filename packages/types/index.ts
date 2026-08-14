import { z } from 'zod';

/**
 * AI学职同伴 — 共享契约层（单一事实来源）
 * Web(apps/web) 与 Worker(apps/worker) 双端 import 本包，避免类型漂移。
 * 领域模型对齐参赛方案 v3.6：面向双非学生的 AI Copilot 式学职陪伴 App。
 */

// ---------- 基础结构 ----------

export const skillNameSchema = z.enum(['diagnose', 'plan', 'practice', 'info', 'package']);
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

// ---------- 记忆层（Mem0 + pgvector，三层）----------

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
  userId: z.string(),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .optional(),
  // L1 会话记忆：召回的近期轮次摘要，注入 prompt 保持连贯
  context: z.array(z.string()).optional(),
  // L2 交互记忆：用户画像摘要，跨会话持久化
  profile: z.string().optional(),
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
  goal: z.string().optional(),
  context: z.array(z.string()).optional(),
  profile: z.string().optional(),
});
export type PlanInput = z.infer<typeof planInputSchema>;

// ---------- Skill 2：实战练兵（项目推送/模拟面试）----------

export const practiceInputSchema = z.object({
  mode: z.enum(['interview', 'algorithm', 'project']).optional().default('interview'),
  topic: z.string().optional(),
  // L1 会话记忆
  context: z.array(z.string()).optional(),
  // L2 交互记忆：用户画像摘要
  profile: z.string().optional(),
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
  resumeText: z.string().optional(),
  targetRole: z.string().optional(),
  // L1 会话记忆
  context: z.array(z.string()).optional(),
  // L2 交互记忆：用户画像摘要
  profile: z.string().optional(),
});
export const packageOutputSchema = z.object({
  reply: z.string().optional(),
  optimizedResume: z.string(),
  projectBullets: z.array(z.string()),
  interviewReview: z.string().optional(),
});
export type PackageInput = z.infer<typeof packageInputSchema>;
export type PackageOutput = z.infer<typeof packageOutputSchema>;

// ---------- 统一 Skill 输入/输出映射（Worker 路由与 Web 共用）----------

export const skillInputMap = {
  diagnose: diagnoseInputSchema,
  plan: planInputSchema,
  practice: practiceInputSchema,
  info: z.object({
    userId: z.string(),
    context: z.array(z.string()).optional(),
    profile: z.string().optional(),
  }),
  package: packageInputSchema,
} as const;

export const skillOutputMap = {
  diagnose: diagnoseOutputSchema,
  plan: planOutputSchema,
  practice: practiceOutputSchema,
  info: infoOutputSchema,
  package: packageOutputSchema,
} as const;

export type SkillInput<N extends SkillName> = z.infer<(typeof skillInputMap)[N]>;
export type SkillOutput<N extends SkillName> = z.infer<(typeof skillOutputMap)[N]>;

// Worker 健康检查
export const healthSchema = z.object({ status: z.literal('ok'), time: z.string() });
export type Health = z.infer<typeof healthSchema>;
