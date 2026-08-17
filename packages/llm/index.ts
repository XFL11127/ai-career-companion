import { generateObject, streamObject } from 'ai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { z } from 'zod'
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
  type SkillName,
  type DiagnoseInput,
  type PlanInput,
  type PracticeInput,
  type PackageInput,
} from '@ai-career-companion/types'

// 抑制 @ai-sdk/deepseek 在结构化输出（generateObject/streamObject）时因
// specificationVersion=v2 兼容模式产生的无害告警。DeepSeek 提供方硬编码 v2，
// 而 AI SDK v7 默认期望 v3 —— 仅影响极个别新特性，不影响功能与流式。属纯噪声，过滤之。
const __origWarn = console.warn
console.warn = (...args: unknown[]) => {
  const head = typeof args[0] === 'string' ? args[0] : String(args[0])
  if (head.includes('specificationVersion') && head.includes('compatibility mode')) return
  __origWarn.apply(console, args as [unknown, ...unknown[]])
}

/**
 * 共享 LLM 调用层。
 * - 有 DEEPSEEK_API_KEY：真实调用 DeepSeek（Vercel AI SDK generateObject），输出经 zod 契约校验。
 * - 无 Key 或调用出错：自动回落确定性 stub（与 zod 契约兼容），保证全链路可联调、可演示。
 * Worker（Cloudflare）与 Web BFF（Node）共用本模块，避免逻辑重复。
 */
// 跨端取 API Key：优先用调用方传入的 env（Cloudflare Worker bindings），回退 Node 的 process.env（Web BFF/本地联调）
function getApiKey(env?: Record<string, string | undefined>): string | undefined {
  if (env?.DEEPSEEK_API_KEY) return env.DEEPSEEK_API_KEY
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  return g.process?.env?.DEEPSEEK_API_KEY
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
          { role: '前端开发工程师', matchScore: 78, reason: '技术栈匹配度较高，建议优先补实习经历' },
          { role: '数据分析助理', matchScore: 70, reason: '双非友好、门槛适中，适合作为切入' },
        ],
      }
    case 'plan':
      return {
        milestones: [
          {
            dayRange: '0-30',
            title: '夯实基础',
            actions: [
              { id: 'a1', title: '完成一个完整前端项目', description: '用 React 做带状态管理的实战项目', type: 'project', status: 'todo' },
              { id: 'a2', title: '刷 50 道算法题', description: '每日 2 题，覆盖数组/字符串/动态规划', type: 'study', status: 'todo' },
            ],
          },
          {
            dayRange: '31-60',
            title: '补实习与作品',
            actions: [
              { id: 'b1', title: '投递 10 份双非友好实习', description: '优先远程/二线城市岗位', type: 'apply', status: 'todo' },
            ],
          },
          {
            dayRange: '61-90',
            title: '冲刺校招',
            actions: [
              { id: 'c1', title: '模拟面试 3 次', description: '用 STAR 复盘项目故事与表达', type: 'review', status: 'todo' },
            ],
          },
        ],
      }
    case 'practice':
      return {
        questions: [
          '介绍一下你做过最有挑战的项目，你在其中承担了什么角色？',
          '如果让你优化一个首屏加载很慢的页面，你会从哪几个方面入手？',
        ],
        feedback: '建议用 STAR 法则组织回答：先讲背景与你的角色，再讲行动与量化结果。',
      }
    case 'info':
      return {
        jobs: [
          { company: '某双非友好科技公司', role: '前端开发实习', salary: '200/天', location: '远程', tags: ['双非友好', '远程'], url: 'https://example.com/job/1', doubleNonFriendly: true },
          { company: '某地市国企信息岗', role: '软件开发', salary: '8-12K', location: '二线城市', tags: ['稳定', '校招'], url: 'https://example.com/job/2', doubleNonFriendly: true },
        ],
      }
    case 'package':
      return {
        optimizedResume: '（示例）突出项目成果与量化指标，弱化学校标签，强调实战能力与业务价值。',
        projectBullets: ['主导 X 项目，用户留存提升 30%', '用 Y 技术将首屏加载从 3s 降到 1s'],
        interviewReview: '准备 1 个深度项目，用 STAR 结构讲清背景、冲突、行动与结果。',
      }
  }
}

// ---------- Prompt 构造（中文，面向双非学生）----------

// L1 会话记忆注入：把召回的近期轮次拼进 prompt，保持连贯（无则忽略）
function withMemory(context?: string[]): string {
  if (!context || context.length === 0) return ''
  const lines = context.map((c, i) => `${i + 1}. ${c}`).join('\n')
  return `\n\n【参考记忆】以下是你与这位用户的近期会话片段，请据此保持回答连贯、避免重复提问：\n${lines}`
}

// L2 交互记忆注入：把用户画像摘要拼进 prompt（无则忽略）
function withProfile(profile?: string): string {
  if (!profile) return ''
  return `\n\n【用户历史画像】\n${profile}`
}

function buildDiagnosePrompt(input: DiagnoseInput): string {
  const self = input.messages?.map((m) => `${m.role}: ${m.content}`).join('\n') ?? ''
  return `你是「AI学职同伴」的破局诊断引擎，专门帮助双非院校学生做能力差距分析。
请基于用户自述，输出五维能力差距（维度名固定为：技术栈 / 实习经历 / 项目经历 / 算法能力 / 信息差），
每维给出 current(0-100)、target(0-100)、gap=target-current，并给 2-3 个推荐岗位（含 matchScore 与 reason）。
用户自述：
${self || '（未提供，请基于双非大三学生典型情况合理推断）'}
请在顶层先输出 reply 字段（2-4 句口语化中文：先共情/鼓励这位双非同学，再给一句下一步行动暗示），再输出 radar 与 recommendedRoles 结构化字段。
只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`
}

function buildPlanPrompt(input: PlanInput): string {
  const base = input.radar
    ? `五维诊断差距：${JSON.stringify(input.radar)}`
    : `用户目标：${input.goal ?? '（未提供，请基于双非大三学生典型情况合理推断）'}`
  return `你是路径规划引擎。基于以下信息，生成 0-30 / 31-60 / 61-90 天三阶段成长路径，
每阶段 1-3 个可执行行动卡（type 取值只能是 study / project / apply / review）。
${base}
请在顶层先输出 reply 字段（2-4 句口语化中文：鼓励这位双非同学 + 一句下一步暗示），再输出 milestones 结构化字段。
只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`
}

function buildPracticePrompt(input: PracticeInput): string {
  const mode = input.mode ?? 'interview'
  return `你是实战练兵引擎。mode=${mode}${input.topic ? `，topic=${input.topic}` : ''}。
生成 2-4 个针对性问题（questions 数组）与一段纠偏反馈（feedback 字符串）。
请在顶层先输出 reply 字段（2-4 句口语化中文：鼓励 + 一句练习建议），再输出 questions/feedback。
只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`
}

function buildInfoPrompt(context?: string[], profile?: string): string {
  return `你是信息差填平引擎。请聚合 2-4 个双非友好的校招 / 实习 / 竞赛信息。
要求：company、role、salary、location、tags(数组)、url(必须是合法 https URL)、doubleNonFriendly=true。
请在顶层先输出 reply 字段（2-4 句口语化中文：说明信息价值 + 一句行动暗示），再输出 jobs 结构化字段。
只输出符合 schema 的 JSON，不要额外解释。${withMemory(context)}${withProfile(profile)}`
}

function buildPackagePrompt(input: PackageInput): string {
  const target = input.targetRole ?? '（未指定，请基于简历推断合适方向）'
  const resume = input.resumeText ?? '（未提供，请先给出简历结构建议并提示用户补充原文）'
  return `你是成果包装引擎。目标岗位：${target}。
简历原文：${resume}
请输出：optimizedResume（优化后的简历文案）、projectBullets（3 条量化项目亮点）、interviewReview（一段面试复盘）。
请在顶层先输出 reply 字段（2-4 句口语化中文：肯定用户 + 一句包装建议），再输出上述结构化字段。
只输出符合 schema 的 JSON，不要额外解释。${withMemory(input.context)}${withProfile(input.profile)}`
}

// ---------- 主入口 ----------
export async function runSkill(
  name: SkillName,
  rawInput: unknown,
  env?: Record<string, string | undefined>,
): Promise<unknown> {
  const deepseek = getApiKey(env) ? createDeepSeek({ apiKey: getApiKey(env)! }) : null
  if (!deepseek) return stubFor(name)
  try {
    switch (name) {
      case 'diagnose': {
        const input = diagnoseInputSchema.parse(rawInput)
        const { object } = await generateObject({
          model: deepseek('deepseek-chat'),
          schema: diagnoseOutputSchema,
          prompt: buildDiagnosePrompt(input),
        })
        return diagnoseOutputSchema.parse(object)
      }
      case 'plan': {
        const input = planInputSchema.parse(rawInput)
        const { object } = await generateObject({
          model: deepseek('deepseek-chat'),
          schema: planOutputSchema,
          prompt: buildPlanPrompt(input),
        })
        return planOutputSchema.parse(object)
      }
      case 'practice': {
        const input = practiceInputSchema.parse(rawInput)
        const { object } = await generateObject({
          model: deepseek('deepseek-chat'),
          schema: practiceOutputSchema,
          prompt: buildPracticePrompt(input),
        })
        return practiceOutputSchema.parse(object)
      }
      case 'info': {
        const infoInput = skillInputMap.info.parse(rawInput) // 校验 userId
        const { object } = await generateObject({
          model: deepseek('deepseek-chat'),
          schema: infoOutputSchema,
          prompt: buildInfoPrompt(infoInput.context, infoInput.profile),
        })
        return infoOutputSchema.parse(object)
      }
      case 'package': {
        const input = packageInputSchema.parse(rawInput)
        const { object } = await generateObject({
          model: deepseek('deepseek-chat'),
          schema: packageOutputSchema,
          prompt: buildPackagePrompt(input),
        })
        return packageOutputSchema.parse(object)
      }
    }
  } catch {
    // LLM 调用失败（限流 / 网络 / 输出不符契约）→ 回落 stub，保证链路不中断
    return stubFor(name)
  }
}

// ---------- 流式入口（Web BFF 用，边生成边返回 partial，消除等待感）----------
export type SkillStreamChunk = { done: boolean; data: unknown; error?: string }

export async function* streamSkill(
  name: SkillName,
  rawInput: unknown,
  env?: Record<string, string | undefined>,
): AsyncGenerator<SkillStreamChunk> {
  const apiKey = getApiKey(env)
  const deepseek = apiKey ? createDeepSeek({ apiKey }) : null
  if (!deepseek) {
    yield { done: true, data: stubFor(name) }
    return
  }
  try {
    let schema: z.ZodTypeAny
    let promptText: string
    switch (name) {
      case 'diagnose': {
        const input = diagnoseInputSchema.parse(rawInput)
        schema = diagnoseOutputSchema
        promptText = buildDiagnosePrompt(input)
        break
      }
      case 'plan': {
        const input = planInputSchema.parse(rawInput)
        schema = planOutputSchema
        promptText = buildPlanPrompt(input)
        break
      }
      case 'practice': {
        const input = practiceInputSchema.parse(rawInput)
        schema = practiceOutputSchema
        promptText = buildPracticePrompt(input)
        break
      }
      case 'info': {
        const infoInput = skillInputMap.info.parse(rawInput)
        schema = infoOutputSchema
        promptText = buildInfoPrompt(infoInput.context, infoInput.profile)
        break
      }
      case 'package': {
        const input = packageInputSchema.parse(rawInput)
        schema = packageOutputSchema
        promptText = buildPackagePrompt(input)
        break
      }
      default:
        yield { done: true, data: stubFor(name) }
        return
    }
    const result = streamObject({ model: deepseek('deepseek-chat'), schema, prompt: promptText })
    for await (const partial of result.partialObjectStream) {
      yield { done: false, data: partial }
    }
    const final = await result.object
    yield { done: true, data: schema.parse(final) }
  } catch {
    // 流式失败（限流 / 网络 / 输出不符契约）→ 回落 stub，保证链路不中断
    yield { done: true, data: stubFor(name) }
  }
}

export { skillNameSchema }
