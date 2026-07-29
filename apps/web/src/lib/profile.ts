/**
 * L2 交互记忆 — 用户画像自动生成引擎
 *
 * 职责：从各 Skill 的输出结果中自动提取关键信息，生成并维护跨会话持久化的用户画像。
 * 画像数据存入 localStorage（免登即用），同时生成 LLM 可读的自然语言摘要注入 prompt。
 *
 * 触发时机：
 * - Skill 调用成功后 → updateFromSkillResult()
 * - 用户发送消息后 → extractUserInfoFromMessage()（提取学校/年级/专业/目标岗位）
 */

import type { DiagnoseOutput, PlanOutput, PracticeOutput } from '@ai-career-companion/types'
import { saveUserProfile } from './memory'

// ---------- 结构化画像数据结构 ----------

export interface SkillGap {
  name: string
  current: number
  target: number
  gap: number
}

export interface UserProfileData {
  nickname?: string
  school?: string
  grade?: string
  major?: string
  targetRole?: string
  lastDiagnoseAt?: number
  skillGaps?: SkillGap[]
  weakestDimension?: string
  strongestDimension?: string
  overallScore?: number
  totalDiagnoses: number
  totalPlans: number
  totalPractices: number
  totalInfo: number
  totalPackages: number
  summary: string
  updatedAt: number
}

// ---------- 默认画像 ----------

function defaultProfile(): UserProfileData {
  return {
    totalDiagnoses: 0,
    totalPlans: 0,
    totalPractices: 0,
    totalInfo: 0,
    totalPackages: 0,
    summary: '',
    updatedAt: Date.now(),
  }
}

// ---------- 存取（localStorage）----------

const PROFILE_KEY = 'user_profile_data'

export function loadProfile(): UserProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return defaultProfile()
    return { ...defaultProfile(), ...JSON.parse(raw) }
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(profile: UserProfileData): void {
  profile.updatedAt = Date.now()
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  saveUserProfile(profile.summary)
}

// ---------- 从用户消息中提取基本信息 ----------

export function extractUserInfoFromMessage(text: string, existing: UserProfileData): UserProfileData {
  const updated = { ...existing }

  const gradeMatch = text.match(/大[一二三四五六]|研[一二三]/)
  if (gradeMatch && !updated.grade) {
    updated.grade = gradeMatch[0]
  }

  const majorPatterns = [
    /计算机|软件工程|信息工程|数据科学|人工智能|电子信息|通信工程|自动化|数学|统计|物理|网络工程/,
  ]
  for (const p of majorPatterns) {
    const m = text.match(p)
    if (m && !updated.major) {
      updated.major = m[0]
      break
    }
  }

  const rolePatterns = [
    /前端|后端|全栈|算法|数据分析|测试|运维|产品经理|UI.?设计|嵌入式|客户端|安全/,
  ]
  for (const p of rolePatterns) {
    const m = text.match(p)
    if (m && !updated.targetRole) {
      updated.targetRole = m[0]
      break
    }
  }

  const schoolMatch = text.match(/[\u4e00-\u9fa5]{2,10}(大学|学院)/)
  if (schoolMatch && !updated.school) {
    updated.school = schoolMatch[0]
  }

  return updated
}

// ---------- 从 Skill 结果更新画像 ----------

function updateFromDiagnose(profile: UserProfileData, output: DiagnoseOutput): UserProfileData {
  const gaps: SkillGap[] = (output.radar ?? []).map((d) => ({
    name: d.name,
    current: d.current,
    target: d.target,
    gap: d.gap,
  }))

  const sorted = [...gaps].sort((a, b) => b.gap - a.gap)
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]

  const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g.gap, 0) / gaps.length : 0

  return {
    ...profile,
    skillGaps: gaps,
    weakestDimension: weakest?.name,
    strongestDimension: strongest?.name,
    overallScore: Math.round(100 - avgGap),
    lastDiagnoseAt: Date.now(),
    totalDiagnoses: profile.totalDiagnoses + 1,
    targetRole: profile.targetRole || output.recommendedRoles?.[0]?.role,
  }
}

function updateFromPlan(profile: UserProfileData, _output: PlanOutput): UserProfileData {
  return { ...profile, totalPlans: profile.totalPlans + 1 }
}

function updateFromPractice(profile: UserProfileData, _output: PracticeOutput): UserProfileData {
  return { ...profile, totalPractices: profile.totalPractices + 1 }
}

// ---------- 生成 LLM 可读摘要 ----------

function generateSummary(profile: UserProfileData): string {
  const parts: string[] = []

  const identity: string[] = []
  if (profile.grade) identity.push(profile.grade)
  if (profile.major) identity.push(profile.major)
  if (profile.school) identity.push(profile.school)
  if (profile.targetRole) identity.push('目标' + profile.targetRole)
  if (identity.length > 0) {
    parts.push('用户身份：' + identity.join('，'))
  }

  if (profile.skillGaps && profile.skillGaps.length > 0) {
    const gapLines = profile.skillGaps
      .map((g) => g.name + '(当前' + g.current + '/目标' + g.target + '，差距' + g.gap + ')')
      .join('；')
    parts.push('最近能力诊断：' + gapLines)
    if (profile.weakestDimension) {
      parts.push('最大短板：' + profile.weakestDimension)
    }
    if (profile.strongestDimension) {
      parts.push('相对优势：' + profile.strongestDimension)
    }
  }

  const activity: string[] = []
  if (profile.totalDiagnoses > 0) activity.push('诊断' + profile.totalDiagnoses + '次')
  if (profile.totalPlans > 0) activity.push('规划' + profile.totalPlans + '次')
  if (profile.totalPractices > 0) activity.push('练兵' + profile.totalPractices + '次')
  if (profile.totalInfo > 0) activity.push('查信息' + profile.totalInfo + '次')
  if (profile.totalPackages > 0) activity.push('包装' + profile.totalPackages + '次')
  if (activity.length > 0) {
    parts.push('使用行为：' + activity.join('，'))
  }

  return parts.join('\n')
}

// ---------- 主入口 ----------

export type SkillNameInput = 'diagnose' | 'plan' | 'practice' | 'info' | 'package'

export function updateFromSkillResult(
  skill: SkillNameInput,
  output: unknown,
  existingProfile?: UserProfileData,
): UserProfileData {
  const profile = existingProfile ?? loadProfile()

  let updated: UserProfileData
  switch (skill) {
    case 'diagnose':
      updated = updateFromDiagnose(profile, output as DiagnoseOutput)
      break
    case 'plan':
      updated = updateFromPlan(profile, output as PlanOutput)
      break
    case 'practice':
      updated = updateFromPractice(profile, output as PracticeOutput)
      break
    case 'info':
      updated = { ...profile, totalInfo: profile.totalInfo + 1 }
      break
    case 'package':
      updated = { ...profile, totalPackages: profile.totalPackages + 1 }
      break
    default:
      updated = profile
  }

  updated.summary = generateSummary(updated)
  saveProfile(updated)

  return updated
}
