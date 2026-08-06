'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Settings, Trash2, Database, User, Palette, Info, Download, AlertTriangle, CheckCircle2, UserCircle2, LogOut, LogIn } from 'lucide-react'
import {
  getUserProfile,
  getStreak,
} from '@/lib/memory'
import {
  loadProfile,
  defaultProfile,
  type UserProfileData,
} from '@/lib/profile'

/** 估算 IndexedDB 存储大小（近似值） */
async function estimateDBSize(): Promise<string> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('ai-career-companion', 2)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    let total = 0
    // 遍历所有 object store
    for (const name of Array.from(db.objectStoreNames)) {
      const tx = db.transaction(name, 'readonly')
      const store = tx.objectStore(name)
      const req = store.getAll()
      await new Promise((resolve) => { req.onsuccess = resolve; req.onerror = resolve })
      if (req.result) {
        const json = JSON.stringify(req.result)
        total += new Blob([json]).size
      }
    }
    db.close()
    if (total < 1024) return `${total} B`
    if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`
    return `${(total / 1024 / 1024).toFixed(1)} MB`
  } catch {
    return '无法读取'
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [dbSize, setDbSize] = useState('计算中…')
  const [streak, setStreak] = useState(0)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  const handleClearAll = useCallback(async () => {
    if (!confirm('确定要清空所有本地数据吗？\n\n这将删除：\n· 所有对话历史\n· Skill 结果缓存\n· 用户画像\n· 连续活跃天数\n\n此操作不可撤销！')) return
    setClearing(true)
    try {
      // 清空 IndexedDB
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('ai-career-companion', 2)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      for (const name of Array.from(db.objectStoreNames)) {
        const tx = db.transaction(name, 'readwrite')
        tx.objectStore(name).clear()
        await new Promise((resolve) => { tx.oncomplete = resolve; tx.onerror = resolve })
      }
      db.close()
      // 清空 localStorage 相关 key
      const keysToRemove = [
        'user_profile', 'user_profile_data', 'anon_user_id',
        'streak-last-active', 'streak-count',
        'hasDiagnosed', 'hasPlanned',
      ]
      keysToRemove.forEach((k) => localStorage.removeItem(k))
      setProfile(defaultProfile())
      setStreak(0)
      setCleared(true)
      setTimeout(() => { estimateDBSize().then(setDbSize) }, 100)
    } catch (e) {
      alert('清空失败：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setClearing(false)
    }
  }, [])

  const handleDeleteAccount = useCallback(async () => {
    if (!confirm('确定注销账号吗？\n\n将退出登录并清空本设备的所有本地数据。\n（云端账号删除功能将在接入 Supabase 后开放）')) return
    await handleClearAll()
    await signOut({ callbackUrl: '/' })
  }, [handleClearAll])

  useEffect(() => {
    setProfile(loadProfile())
    setStreak(getStreak())
    estimateDBSize().then(setDbSize)
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-ink mb-2 flex items-center gap-2">
          <Settings className="h-7 w-7 text-accent" />
          设置
        </h1>
        <p className="text-sm text-ink/60">管理你的本地数据和偏好</p>
      </div>

      {/* 账号 */}
      <section className="mb-6 rounded-lg border border-ink/10 bg-paper p-4">
        <h2 className="flex items-center gap-2 font-medium text-sm text-ink mb-3">
          <UserCircle2 className="h-4 w-4 text-accent" />
          账号
        </h2>
        {session?.user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-md bg-ink/5 px-3 py-2">
              <UserCircle2 className="h-8 w-8 text-ink/40" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{session.user.name || '已登录用户'}</p>
                <p className="truncate text-xs text-ink/50">{session.user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-2 text-xs font-medium text-ink transition hover:bg-ink/5"
              >
                <LogOut className="h-3.5 w-3.5" /> 登出此账号
              </button>
              <Link
                href="/login"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-2 text-xs font-medium text-ink transition hover:bg-ink/5"
              >
                <LogIn className="h-3.5 w-3.5" /> 切换 / 其他账号登录
              </Link>
              <button
                onClick={handleDeleteAccount}
                className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> 注销账号
              </button>
            </div>
            <p className="text-xs text-ink/40">
              注销将退出登录并清空本设备本地数据。云端账号删除功能将在接入 Supabase 后开放。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-ink/50">
              你当前处于<strong className="text-ink">匿名模式</strong>，所有数据存于本地浏览器。登录后可跨设备同步学职记忆。
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-medium text-paper transition hover:bg-[#c94a23]"
            >
              <LogIn className="h-3.5 w-3.5" /> 登录 / 注册
            </Link>
          </div>
        )}
      </section>

      {/* 用户画像概览 */}
      <section className="mb-6 rounded-lg border border-ink/10 bg-paper p-4">
        <h2 className="flex items-center gap-2 font-medium text-sm text-ink mb-3">
          <User className="h-4 w-4 text-accent" />
          用户画像（L2 记忆）
        </h2>
        {profile ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoField label="年级" value={profile.grade || '未设置'} />
            <InfoField label="专业" value={profile.major || '未设置'} />
            <InfoField label="学校" value={profile.school || '未设置'} />
            <InfoField label="目标岗位" value={profile.targetRole || '未设置'} />
            <InfoField label="诊断次数" value={String(profile.totalDiagnoses)} />
            <InfoField label="规划次数" value={String(profile.totalPlans)} />
            <InfoField label="练兵次数" value={String(profile.totalPractices)} />
            <InfoField label="连续活跃" value={`${streak} 天`} highlight />
            <InfoField label="最弱维度" value={profile.weakestDimension || '-'} />
          </div>
        ) : (
          <p className="text-xs text-ink/40">加载中…</p>
        )}
      </section>

      {/* 存储管理 */}
      <section className="mb-6 rounded-lg border border-ink/10 bg-paper p-4">
        <h2 className="flex items-center gap-2 font-medium text-sm text-ink mb-3">
          <Database className="h-4 w-4 text-blue-500" />
          本地存储
        </h2>
        <div className="flex items-center justify-between rounded-md bg-ink/5 px-3 py-2 mb-3">
          <span className="text-xs text-ink/60">IndexedDB 占用空间</span>
          <span className="text-xs font-mono font-medium text-ink">{dbSize}</span>
        </div>
        <p className="text-xs text-ink/40 mb-3">
          数据包括：对话历史、Skill 结果缓存、会话归档。全部存储在你的浏览器本地，不会上传到服务器。
        </p>
        <button
          onClick={handleClearAll}
          disabled={clearing}
          className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {clearing ? '清空中…' : '清空所有本地数据'}
        </button>
        {cleared && (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> 已清空所有本地数据
          </p>
        )}
      </section>

      {/* 外观（预留） */}
      <section className="mb-6 rounded-lg border border-ink/10 bg-paper p-4 opacity-60">
        <h2 className="flex items-center gap-2 font-medium text-sm text-ink mb-2">
          <Palette className="h-4 w-4 text-purple-500" />
          外观
        </h2>
        <p className="text-xs text-ink/40">主题切换功能即将推出。当前使用默认亮色主题。</p>
      </section>

      {/* 关于 */}
      <section className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
        <h2 className="flex items-center gap-2 font-medium text-sm text-ink mb-2">
          <Info className="h-4 w-4 text-amber-600" />
          关于
        </h2>
        <div className="space-y-1 text-xs text-ink/60 leading-relaxed">
          <p><strong>AI 学职同伴</strong> — iCAN 参赛项目</p>
          <p>面向双非学生的 AI Copilot 式学职陪伴产品。</p>
          <p>技术栈：Next.js + React + Tailwind CSS + DeepSeek AI</p>
          <p className="flex items-center gap-1 pt-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            当前为 MVP 版本，数据仅存于浏览器本地。登录和云端同步功能即将上线。
          </p>
        </div>
      </section>
    </div>
  )
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-2.5 py-1.5 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-ink/10 bg-ink/[0.02]'}`}>
      <p className="text-[10px] uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-amber-700' : 'text-ink'}`}>{value || '—'}</p>
    </div>
  )
}
