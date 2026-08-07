'use client'

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface AuthContextType extends AuthState {
  /** 邮箱注册 */
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  /** 邮箱登录 */
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  /** 退出登录 */
  signOut: () => Promise<void>
  /** 设置为匿名用户（不登录继续使用） */
  continueAsGuest: () => void
  /** 是否匿名模式 */
  isGuest: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true })
  const [isGuest, setIsGuest] = useState(true)

  useEffect(() => {
    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
      if (session?.user) setIsGuest(false)
    })

    // 初始会话检查
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      // 友好错误提示
      const msg = error.message.includes('already registered')
        ? '该邮箱已注册，请直接登录'
        : error.message.includes('password')
          ? '密码长度至少为 6 位'
          : '注册失败，请稍后重试'
      return { error: msg }
    }
    // 注册成功后自动创建用户画像
    const user = (await supabase.auth.getSession()).data.session?.user
    if (user) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          nickname: email.split('@')[0],
        })
      } catch { /* 画像创建失败不阻塞注册流程 */ }
    }
    return {}
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.includes('Invalid login')
        ? '邮箱或密码错误'
        : '登录失败，请稍后重试'
      return { error: msg }
    }

    // 登录成功 → 跨设备同步
    const session = (await supabase.auth.getSession()).data.session
    if (session?.user) {
      try {
        const { uploadLocalToCloud, pullFromCloud } = await import('./sync')
        // 1. 先上传本地数据到云端
        await uploadLocalToCloud(session.user.id)
        // 2. 从云端拉取最新画像
        const cloudProfile = await pullFromCloud(session.user.id)
        if (cloudProfile) {
          const { saveProfile, loadProfile } = await import('./profile')
          const localProfile = loadProfile()
          // 合并策略：云端优先，本地作为缺失字段的补充
          const merged = { ...localProfile, ...cloudProfile, updatedAt: Date.now() }
          saveProfile(merged)
        }
      } catch { /* 同步失败不阻塞登录 */ }
    }

    return {}
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsGuest(true)
    // 清除本地会话数据（L1），保留云端数据
    try {
      localStorage.removeItem('ai_career_profile')
      localStorage.removeItem('user_profile')
      // 清除 IndexedDB 中的会话轮次
      const req = indexedDB.deleteDatabase('ai-career-companion')
      req.onsuccess = () => {}
      req.onerror = () => {}
    } catch { /* 清理失败不阻塞 */ }
  }

  const continueAsGuest = () => {
    setIsGuest(true)
    setState(prev => ({ ...prev, loading: false }))
  }

  return (
    <AuthContext.Provider value={{ ...state, signUp, signIn, signOut, continueAsGuest, isGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
