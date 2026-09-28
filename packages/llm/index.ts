import { generateObject, streamObject } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { z } from 'zod';
import {
  skillNameSchema,
  skillInputMap,
  diagnoseInputSchema,
  diagnoseOutputSchema,
  planInputSchema,
  planOutputSchema,
  practiceInputSchema,
  practiceOutputSchema,
  infoOutputSchema,
  packageInputSchema,
  packageOutputSchema,
  resumeInputSchema,
  resumeOutputSchema,
  interviewInputSchema,
  interviewOutputSchema,
  matchInputSchema,
  matchOutputSchema,
  courseInputSchema,
  courseOutputSchema,
  assessmentInputSchema,
  assessmentOutputSchema,
  type SkillName,
  type DiagnoseInput,
  type PlanInput,
  type PracticeInput,
  type PackageInput,
  type ResumeInput,
  type InterviewInput,
  type MatchInput,
  type CourseInput,
  type AssessmentInput,
  type SkillRunMeta,
} from '@ai-career-companion/types';

// 抑制 @ai-sdk/deepseek 在结构化输出（generateObject/streamObject）时因
// specificationVersion=v2 兼容模式产生的无害告警。DeepSeek 提供方硬编码 v2，
// 而 AI SDK v7 默认期望 v3 —— 仅影响极个别新特性，不影响功能与流式。属纯噪声，过滤之。
const __origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const head = typeof args[0] === 'string' ? args[0] : String(args[0]);
  if (head.includes('specificationVersion') && head.includes('compatibility mode')) return;
  __origWarn.apply(console, args as [unknown, ...unknown[]]);
};

/**
 * 共享 LLM 调用层。
 * - 有 DEEPSEEK_API_KEY：真实调用 DeepSeek（Vercel AI SDK generateObject），输出经 zod 契约校验。
 * - 无 Key 或调用出错：自动回落确定性 stub（与 zod 契约兼容），保证全链路可联调、可演示。
 * Worker（Cloudflare）与 Web BFF（Node）共用本模块，避免逻辑重复。
 */
// 跨端取 API Key：优先用调用方传入的 env（Cloudflare Worker bindings），回退 Node 的 process.env（Web BFF/本地联调）
function getApiKey(env?: Record<string, string | undefined>): string | undefined {
  if (env?.DEEPSEEK_API_KEY) return env.DEEPSEEK_API_KEY;
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.DEEPSEEK_API_KEY;
}

// ---------- 确定性 stub（兜底）----------
export function stubFor(name: SkillName): unknown {
  switch (name) {
    case 'diagnose':
      return {
        radar: [
          { name: '技术栈', current: 40, target: 80, gap: 40 },
          { name: '实习经历', current: 20, target: 70, gap: 50 },
          { name: '项目经历', current: 30, target: 75, gap: 45 },
          { name: '算法能力', current: 35, target: 70, gap: 35 },
          { name: '信息差', current: 25, target: 65, gap: 40 },
        ],
        recommendedRoles: [
          {
            role: '前端开发工程师',
            matchScore: 78,
            reason: '技术栈匹配度较高，建议优先补实习经历',
          },
          { role: '数据分析助理', matchScore: 70, reason: '双非友好、门槛适中，适合作为切入' },
        ],
      };
    case 'plan':
      return {
        milestones: [
          {
            dayRange: '0-30',
            title: '夯实基础',
            actions: [
              {
                id: 'a1',
                title: '完成一个完整前端项目',
                description: '用 React 做带状态管理的实战项目',
                type: 'project',
                status: 'todo',
              },
              {
                id: 'a2',
                title: '刷 50 道算法题',
                description: '每日 2 题，覆盖数组/字符串/动态规划',
                type: 'study',
                status: 'todo',
              },
            ],
          },
          {
            dayRange: '31-60',
            title: '补实习与作品',
            actions: [
              {
                id: 'b1',
                title: '投递 10 份双非友好实习',
                description: '优先远程/二线城市岗位',
                type: 'apply',
                status: 'todo',
              },
            ],
          },
          {
            dayRange: '61-90',
            title: '冲刺校招',
            actions: [
              {
                id: 'c1',
                title: '模拟面试 3 次',
                description: '用 STAR 复盘项目故事与表达',
                type: 'review',
                status: 'todo',
              },
            ],
          },
        ],
      };
    case 'practice':
      return {
        questions: [
          '介绍一下你做过最有挑战的项目，你在其中承担了什么角色？',
          '如果让你优化一个首屏加载很慢的页面，你会从哪几个方面入手？',
        ],
        feedback: '建议用 STAR 法则组织回答：先讲背景与你的角色，再讲行动与量化结果。',
      };
    case 'info':
      // 降级时不再编造岗位：宁可为空，也不给用户假机会。
      return {
        jobs: [],
        reply:
          '（降级模式）当前未接入真实检索，因此不生成任何岗位，避免给你假机会。请到「信息中枢」查看已核实证据，或配置检索 Key 后再试。',
      };
    case 'package':
      return {
        optimizedResume: '（示例）突出项目成果与量化指标，弱化学校标签，强调实战能力与业务价值。',
        projectBullets: ['主导 X 项目，用户留存提升 30%', '用 Y 技术将首屏加载从 3s 降到 1s'],
        interviewReview: '准备 1 个深度项目，用 STAR 结构讲清背景、冲突、行动与结果。',
      };
    case 'resume':
      return {
        overallScore: 72,
        atsScore: 68,
        dimensions: [
          { name: '关键词覆盖', score: 66, comment: '与目标岗位高频技能还有明显缺口' },
          { name: '成果量化', score: 71, comment: '已有数据，但项目结果还能更具体' },
          { name: '结构可读性', score: 79, comment: '结构清楚，可进一步压缩无效描述' },
          { name: '岗位相关性', score: 70, comment: '需要把课程项目改写成岗位语言' },
        ],
        missingKeywords: ['性能优化', '工程化', '协作交付'],
        strengths: ['项目经历完整', '技术栈与目标岗位有交集', '表达简洁'],
        rewriteSuggestions: [
          {
            section: '项目经历',
            before: '负责开发了一个管理系统。',
            after: '主导 3 人小组开发课程管理系统，支撑 500+ 条数据。',
            reason: '补充角色、技术和量化结果。',
          },
        ],
        optimizedResume: '（示例优化稿）项目经历已按岗位关键词重写。',
        projectBullets: ['主导课程管理系统开发，支撑 500+ 条数据。'],
        nextActions: ['补充岗位关键词', '为项目增加量化结果'],
      };
    case 'interview':
      return {
        questions: [
          {
            id: 'q1',
            category: '项目',
            question: '请介绍一个你最熟悉的项目。',
            intention: '确认项目真实性与个人贡献。',
            starHint: 'S 背景 → T 目标 → A 行动 → R 结果。',
            sampleAnswer: '讲清你的角色、关键决策和量化结果。',
          },
        ],
        followUps: ['这个结果是如何测量的？'],
        improvementPlan: ['用 STAR 复述项目', '补充量化指标'],
      };
    case 'match':
      return {
        overallScore: 74,
        recommendation: 'caution',
        summary: '方向匹配，但需要补齐关键能力证据后再投。',
        dimensions: [
          { key: 'skills', name: '技能匹配', score: 78, weight: 30, reason: '核心技能有重合' },
          {
            key: 'experience',
            name: '经验相关',
            score: 62,
            weight: 25,
            reason: '项目接近岗位但深度不足',
          },
          { key: 'location', name: '地域匹配', score: 85, weight: 15, reason: '地点匹配' },
          { key: 'industry', name: '行业匹配', score: 70, weight: 15, reason: '方向一致' },
          { key: 'trajectory', name: '职业轨迹', score: 76, weight: 15, reason: '成长路径合理' },
        ],
        strengths: ['技术栈有交集'],
        missingKeywords: ['性能优化', '自动化测试'],
        risks: ['成果量化不足'],
        actions: ['补齐关键词后重新评分'],
      };
    case 'course':
      return {
        summary: '资料围绕核心概念和运行机制展开。',
        concepts: [
          {
            term: '核心概念',
            explanation: '基础定义。',
            example: '最小案例。',
            whyItMatters: '后续知识都建立在此。',
          },
        ],
        flashcards: [
          { id: 'c1', front: '核心定义是什么？', back: '用自己的话复述。', tags: ['基础'] },
        ],
        quiz: [
          {
            id: 'quiz1',
            type: 'short-answer',
            question: '解释该知识点。',
            options: [],
            answer: '定义、机制、应用条件。',
            explanation: '检查迁移能力。',
          },
        ],
        studyPlan: [{ dayRange: '1-2', goal: '建立框架', tasks: ['整理概念卡'] }],
        misconceptions: ['只背定义，不理解边界。'],
      };
    case 'assessment':
      return {
        profileTitle: '务实探索型成长者',
        profileCode: 'C-I-V',
        disclaimer: '本结果仅作职业探索参考，不是心理诊断。',
        dimensions: [
          {
            key: 'interest',
            name: '兴趣驱动',
            score: 76,
            level: '高',
            description: '愿意通过实践获得反馈。',
          },
        ],
        traits: ['务实', '愿意学习'],
        strengths: ['目标感较强'],
        growthAreas: ['用真实任务验证偏好'],
        recommendedCareers: [
          {
            role: '软件工程师',
            fitScore: 82,
            reason: '实践驱动与岗位特征接近。',
            nextStep: '完成一个可展示的项目。',
          },
        ],
        actionPlan: ['用一次真实任务验证兴趣', '两周后重新评估'],
      };
  }
}

// ---------- Prompt 构造（中文，面向双非学生）----------

// L1 会话记忆注入：把召回的近期轮次拼进 prompt，保持连贯（无则忽略）
function withMemory(context?: string[]): string {
  if (!context || context.length === 0) return '';
  const lines = context.map((c, i) => `${i + 1}. ${c}`).join('\n');
  return `\n\n【参考记忆】以下是你与这位用户的近期会话片段，请据此保持回答连贯、避免重复提问：\n${lines}`;
}

// L2 交互记忆注入：把用户画像摘要拼进 prompt（无则忽略）
function withProfile(profile?: string): string {
  if (!profile) return '';
  return `\n\n【用户历史画像】\n${profile}`;
}

function buildDiagnosePrompt(input: DiagnoseInput): string {
  const self = input.messages?.map((m) => `${m.role}: ${m.content}`).join('\n') ?? '';
  return `你是「AI学职同伴」的破局诊断引擎，专门帮助双非院校学生做能力差距分析。你说话像一位懂双非现实、不画饼的学长学姐。

要求：
1. 五维差距维度名固定为：技术栈 / 实习经历 / 项目经历 / 算法能力 / 信息差。双非同学通常「信息差」和「实习经历」缺口最大，请基于自述如实打分（current 0-100、target 0-100、gap=target-current），不要平均主义。
2. recommendedRoles 给 2-3 个岗位，matchScore 要区分度高（如 82/71/63 而非 80/79/78）；reason 必须点出「为什么适合这位双非同学」+ 一个具体入手动作（例如「先去学校就业网/实习僧筛 5 个远程岗投一轮」），不要写空话。
3. 顶层 reply（2-4 句口语化中文）：先共情这位双非同学的处境，再给一句本周就能做的微小行动暗示，语气真诚不鸡汤。

用户自述：
${self || '（未提供，请基于双非大三计算机相关学生典型情况合理推断，信息差与实习经历偏低的设定）'}
只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`;
}

function buildPlanPrompt(input: PlanInput): string {
  const base = input.radar
    ? `五维诊断差距：${JSON.stringify(input.radar)}`
    : `用户目标：${input.goal ?? '（未提供，请基于双非大三学生典型情况合理推断）'}`;
  return `你是路径规划引擎，专门给双非同学做可落地的成长路径。你输出的是「能照着做」的计划，不是愿景。

要求：
1. 生成 0-30 / 31-60 / 61-90 天三阶段，每阶段 1-3 个行动卡（type 只能是 study / project / apply / review）。
2. 每个 action 的 description 必须写清「做到什么程度算完成」「去哪做」：优先点名双非友好的渠道（实习僧 / BOSS直聘 / 学校就业指导中心 / 牛客 / 实验室项目 / 开源 contribution），避免「多刷题」「多实习」这类无法验收的空话。
3. apply 类行动要给出具体的投递数量与筛选标准（如「投 10 个远程/二线城市实习岗，优先标注双非友好」）。
4. 顶层 reply（2-4 句中文）：鼓励这位同学，并点出「第 0-30 天里性价比最高的一件事」。

${base}
只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`;
}

function buildPracticePrompt(input: PracticeInput): string {
  const mode = input.mode ?? 'interview';
  const modeHint =
    mode === 'algorithm'
      ? '算法题：出 1-2 道双非校招常见、能在白板上手撕的题（数组/字符串/简单动态规划），重点考思路与编码清晰度，不要出超纲的竞赛难题'
      : mode === 'project'
        ? '项目深挖：围绕他做过的项目问技术细节、遇到的难点、如何量化结果，考察把经历讲清楚的能力'
        : '综合面试：技术 + 行为混合，贴近双非校招真实节奏（含一个 STAR 行为题）';
  const topic = input.topic ? `，主题聚焦于：${input.topic}` : '';
  return `你是实战练兵引擎，专门陪双非同学练面试。${modeHint}${topic}。

要求：
1. 生成 2-4 个针对性问题（questions 数组），问题要具体、能开口答，不要「请介绍一下你自己」这种过大过空的开场题；技术/算法题最好能引导到他做过的项目上。
2. feedback 是一段纠偏反馈：先肯定亮点，再指出 1 个最该改的点，并给可操作的练习方法（如「用 STAR 把第 2 题重写一遍，重点补量化结果」）。
3. 顶层 reply（2-4 句中文）：鼓励 + 一句本次练习建议。

只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`;
}

function buildInfoPrompt(context?: string[], profile?: string): string {
  return `你是信息差填平引擎，专门帮双非同学找「够得着」的机会。

硬性要求（违反即视为无效输出）：
1. 只允许输出「来源明确、可点击核对」的机会。company / role / url 必须来自真实公告，禁止使用「某公司」「某双非友好科技公司」这类占位名。
2. 每个 job 必须填 evidenceQuote：从该公告原文逐字复制的依据句（例如「本科及以上学历，不限毕业院校」「不限专业」）。摘不出原文依据就不要输出这一条。
3. 禁止编造 url，也不要用平台搜索页或首页充当具体岗位链接。
4. 不要给 job 打「双非友好」标签——标签由系统依据 evidenceQuote + 来源可信度自动判定。
5. 如果上下文中没有可用的真实信息，jobs 直接返回空数组，并在 reply 里说明「先去信息中枢检索或补充来源」，不要用猜测填充。

只输出符合 schema 的 JSON，不要额外解释。${withMemory(context)}${withProfile(profile)}`;
}

function buildPackagePrompt(input: PackageInput): string {
  const target = input.targetRole ?? '（未指定，请基于简历推断合适方向）';
  const resume = input.resumeText ?? '（未提供，请先给出简历结构建议并提示用户补充原文）';
  return `你是成果包装引擎，专门帮双非同学把「普通经历」讲出「业务价值」。你懂怎么把学校标签的弱势转化为务实、能打的叙事。

要求：
1. 目标岗位：${target}。简历原文：${resume}
2. optimizedResume：ATS 友好的优化文案，用动词开头、带量化结果（如「用户留存 +30%」「首屏 3s→1s」）；不要堆砌学校名，用项目成果说话。
3. projectBullets：3 条量化项目亮点，每条遵循「动作 + 技术 + 量化结果」，可直接贴进简历。
4. interviewReview：一段面试复盘，重点教双非同学「被问到学校时怎么正面接住」（如强调实战、自驱、业务理解），并给 1 个可练的表达模板。
5. 顶层 reply（2-4 句中文）：肯定这位同学的已有积累 + 一句最该先改的包装点。

只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`;
}

function buildResumePrompt(input: ResumeInput): string {
  return `你是资深招聘官和 ATS 简历优化师。不得编造经历或数据。\n目标岗位：${input.targetRole}\n简历：${input.resumeText}\nJD：${input.jobDescription || '未提供'}\n输出综合分、ATS 分、维度评分、缺失关键词、改写建议、优化稿和下一步动作。只输出 JSON。${withMemory(input.context)}${withProfile(input.profile)}`;
}
function buildInterviewPrompt(input: InterviewInput): string {
  const answers =
    input.priorAnswers?.map((a, i) => `${i + 1}. ${a.question}\n${a.answer}`).join('\n') ||
    '尚无回答';
  return `你是校招面试官和教练。目标岗位：${input.targetRole}；模式：${input.mode}；语言：${input.language}。\n简历：${input.resumeText || '未提供'}\nJD：${input.jobDescription || '未提供'}\n用户回答：${answers}\n生成 4-6 道题、STAR 提示、参考框架；有回答时给出评分和追问。不得编造用户经历。只输出 JSON。${withMemory(input.context)}${withProfile(input.profile)}`;
}
function buildMatchPrompt(input: MatchInput): string {
  return `你是校招岗位匹配分析师。简历：${input.resumeText}\nJD：${input.jobDescription}\n地点：${input.targetLocation || '未提供'}；行业：${input.targetIndustry || '未提供'}；目标：${input.careerGoal || '未提供'}\n按技能/经验/地域/行业/职业轨迹五维评分，权重合计 100；信息不足时建议慎投。输出优势、缺失词、风险和行动。只输出 JSON。${withMemory(input.context)}${withProfile(input.profile)}`;
}
function buildCoursePrompt(input: CourseInput): string {
  return `你是学习科学教练。资料名：${input.materialName || '未命名'}；目标：${input.goal || '掌握核心内容'}；水平：${input.level}\n资料：${input.materialText}\n生成摘要、概念解释、抽认卡、小测和多日学习计划。严格基于资料，未展开处注明。只输出 JSON。${withMemory(input.context)}${withProfile(input.profile)}`;
}
function buildAssessmentPrompt(input: AssessmentInput): string {
  return `你是职业探索教练。根据 1-5 分作答生成探索画像，必须声明不是心理诊断。\n作答：${JSON.stringify(input.answers)}\n目标岗位：${input.targetRole || '未提供'}\n给出维度、特质、优势、待验证假设、5-10 个职业方向和 2-4 周计划。只输出 JSON。${withMemory(input.context)}${withProfile(input.profile)}`;
}

type PreparedSkill = { schema: z.ZodTypeAny; promptText: string };

/**
 * Validates and normalizes an incoming Skill request before any provider call. This is intentionally
 * separate from fallback handling: malformed client input is a 400 at the BFF, never a fake success.
 */
function prepareSkill(name: SkillName, rawInput: unknown): PreparedSkill {
  switch (name) {
    case 'diagnose': {
      const input = diagnoseInputSchema.parse(rawInput);
      return { schema: diagnoseOutputSchema, promptText: buildDiagnosePrompt(input) };
    }
    case 'plan': {
      const input = planInputSchema.parse(rawInput);
      return { schema: planOutputSchema, promptText: buildPlanPrompt(input) };
    }
    case 'practice': {
      const input = practiceInputSchema.parse(rawInput);
      return { schema: practiceOutputSchema, promptText: buildPracticePrompt(input) };
    }
    case 'info': {
      const input = skillInputMap.info.parse(rawInput);
      return {
        schema: infoOutputSchema,
        promptText: buildInfoPrompt(input.context, input.profile),
      };
    }
    case 'package': {
      const input = packageInputSchema.parse(rawInput);
      return { schema: packageOutputSchema, promptText: buildPackagePrompt(input) };
    }
    case 'resume': {
      const input = resumeInputSchema.parse(rawInput);
      return { schema: resumeOutputSchema, promptText: buildResumePrompt(input) };
    }
    case 'interview': {
      const input = interviewInputSchema.parse(rawInput);
      return { schema: interviewOutputSchema, promptText: buildInterviewPrompt(input) };
    }
    case 'match': {
      const input = matchInputSchema.parse(rawInput);
      return { schema: matchOutputSchema, promptText: buildMatchPrompt(input) };
    }
    case 'course': {
      const input = courseInputSchema.parse(rawInput);
      return { schema: courseOutputSchema, promptText: buildCoursePrompt(input) };
    }
    case 'assessment': {
      const input = assessmentInputSchema.parse(rawInput);
      return { schema: assessmentOutputSchema, promptText: buildAssessmentPrompt(input) };
    }
  }
}

export type SkillRunResult = { data: unknown; meta: SkillRunMeta };
export type SkillStreamChunk = { done: boolean; data: unknown; error?: string; meta: SkillRunMeta };

const providerMeta: SkillRunMeta = { provider: 'deepseek', degraded: false };

function fallbackResult(
  name: SkillName,
  reason: 'missing_api_key' | 'provider_error'
): SkillRunResult {
  return {
    data: stubFor(name),
    meta: { provider: 'stub', degraded: true, reason },
  };
}

/** Non-streaming API with explicit provider/fallback state for callers that need it. */
export async function runSkillWithMeta(
  name: SkillName,
  rawInput: unknown,
  env?: Record<string, string | undefined>
): Promise<SkillRunResult> {
  const prepared = prepareSkill(name, rawInput);
  const apiKey = getApiKey(env);
  if (!apiKey) return fallbackResult(name, 'missing_api_key');

  const deepseek = createDeepSeek({ apiKey });
  try {
    const { object } = await generateObject({
      model: deepseek('deepseek-chat'),
      schema: prepared.schema,
      prompt: prepared.promptText,
    });
    return { data: prepared.schema.parse(object), meta: providerMeta };
  } catch {
    // Do not surface provider internals or request content; the client gets an explicit safe fallback.
    return fallbackResult(name, 'provider_error');
  }
}

/** Backwards-compatible non-streaming API. New code should prefer runSkillWithMeta. */
export async function runSkill(
  name: SkillName,
  rawInput: unknown,
  env?: Record<string, string | undefined>
): Promise<unknown> {
  return (await runSkillWithMeta(name, rawInput, env)).data;
}

// ---------- 流式入口（Web BFF 用，边生成边返回 partial，消除等待感）----------
export async function* streamSkill(
  name: SkillName,
  rawInput: unknown,
  env?: Record<string, string | undefined>
): AsyncGenerator<SkillStreamChunk> {
  const prepared = prepareSkill(name, rawInput);
  const apiKey = getApiKey(env);
  if (!apiKey) {
    const fallback = fallbackResult(name, 'missing_api_key');
    yield { done: true, ...fallback };
    return;
  }

  const deepseek = createDeepSeek({ apiKey });
  try {
    const result = streamObject({
      model: deepseek('deepseek-chat'),
      schema: prepared.schema,
      prompt: prepared.promptText,
    });
    for await (const partial of result.partialObjectStream) {
      yield { done: false, data: partial, meta: providerMeta };
    }
    const final = await result.object;
    yield { done: true, data: prepared.schema.parse(final), meta: providerMeta };
  } catch {
    // Do not surface provider internals or request content; the client gets an explicit safe fallback.
    const fallback = fallbackResult(name, 'provider_error');
    yield { done: true, ...fallback };
  }
}

export { skillNameSchema };
