/**
 * P4 同步引擎：本地 ↔ Supabase 云端双向同步
 *
 * 策略：
 * - 首次登录 → uploadLocalToCloud() 批量上传所有本地数据到云端
 * - 后续操作 → 实时双写（本地 + 云端同时写入）
 * - 冲突解决 → 云端 updatedAt 优先，本地数据作为备份
 */

import { supabase } from './supabase'
import { loadProfile, type UserProfileData } from './profile'
import type { ChatMessage, Conversation, MemoryTurn } from './memory'

// ---------- 首次登录：上传本地限量数据 ----------

interface UploadResult {
  profiles: boolean
  skillSessions: boolean
  conversations: boolean
}

export async function uploadLocalToCloud(userId: string): Promise<UploadResult> {
  const result: UploadResult = { profiles: false, skillSessions: false, conversations: false }

  // 1. 上传用户画像
  try {
    const profile = loadProfile()
    await supabase.from('profiles').upsert({
      id: userId,
      nickname: profile.nickname || '',
      school: profile.school || '',
      grade: profile.grade || '大一',
      major: profile.major || '',
      target_role: profile.targetRole || '',
      goals: [] as string[],
      streak_days: 0,
    })
    result.profiles = true
  } catch { /* 画像上传失败不阻塞 */ }

  // 2. 上传近期 Skill 会话（IndexedDB → skill_sessions）
  try {
    const chatKeys = ['diagnose', 'plan', 'practice', 'info', 'package']
    for (const skill of chatKeys) {
      const turns = await loadMemoryTurns(skill)
      for (const turn of turns.slice(-5)) {
        await supabase.from('skill_sessions').insert({
          user_id: userId,
          skill_name: skill,
          input: turn.input,
          output: turn.output,
        })
      }
    }
    result.skillSessions = true
  } catch { /* 会话上传失败不阻塞 */ }

  // 3. 上传历史会话列表
  try {
    const convs = await loadConversationsRaw()
    for (const conv of convs.slice(0, 10)) {
      await supabase.from('skill_sessions').insert({
        user_id: userId,
        skill_name: conv.skill,
        input: { title: conv.title, type: 'conversation_archive' },
        output: { messages: conv.messages },
      })
    }
    result.conversations = true
  } catch { /* 会话列表上传失败不阻塞 */ }

  return result
}

// ---------- 登录后：从云端拉取 ----------

export async function pullFromCloud(userId: string): Promise<UserProfileData | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null

    return {
      nickname: data.nickname ?? '',
      school: data.school ?? '',
      grade: data.grade ?? '大一',
      major: data.major ?? '',
      targetRole: data.target_role ?? '',
      totalDiagnoses: 0,
      totalPlans: 0,
      totalPractices: 0,
      totalInfo: 0,
      totalPackages: 0,
      summary: '',
      updatedAt: Date.now(),
    }
  } catch {
    return null
  }
}

// ---------- 实时双写辅助函数 ----------

/**
 * 登录后实时写入 Skill 会话到云端。
 * 在现有 appendTurn 后调用，登录态下自动同步。
 */
export async function syncSkillSession(userId: string, skill: string, input: unknown, output: unknown): Promise<void> {
  try {
    await supabase.from('skill_sessions').insert({
      user_id: userId,
      skill_name: skill,
      input,
      output,
    })
  } catch { /* 云端写入失败不阻塞本地 */ }
}

/**
 * 登录后实时同步用户画像到云端。
 */
export async function syncProfile(userId: string, profile: UserProfileData): Promise<void> {
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      nickname: profile.nickname || '',
      school: profile.school || '',
      grade: profile.grade || '大一',
      major: profile.major || '',
      target_role: profile.targetRole || '',
      streak_days: 0,
    })
  } catch { /* 云端写入失败不阻塞本地 */ }
}

// ---------- 内部辅助 ----------

async function loadMemoryTurns(skill: string): Promise<MemoryTurn[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open('ai-career-companion', 2)
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('skill_memory')) { db.close(); resolve([]); return }
      const tx = db.transaction('skill_memory', 'readonly')
      const getReq = tx.objectStore('skill_memory').get(skill)
      getReq.onsuccess = () => { db.close(); resolve((getReq.result as MemoryTurn[] | undefined) ?? []) }
      getReq.onerror = () => { db.close(); resolve([]) }
    }
    req.onerror = () => resolve([])
  })
}

async function loadConversationsRaw(): Promise<Conversation[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open('ai-career-companion', 2)
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('skill_memory')) { db.close(); resolve([]); return }
      const tx = db.transaction('skill_memory', 'readonly')
      const getReq = tx.objectStore('skill_memory').get('conversations')
      getReq.onsuccess = () => { db.close(); resolve((getReq.result as Conversation[] | undefined) ?? []) }
      getReq.onerror = () => { db.close(); resolve([]) }
    }
    req.onerror = () => resolve([])
  })
}
