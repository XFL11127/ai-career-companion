'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signUp, signIn, continueAsGuest, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 已登录则直接跳转首页
  if (!loading && user) {
    router.push('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = isRegister ? await signUp(email, password) : await signIn(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else if (isRegister) {
      setError('注册成功！请检查邮箱确认链接（或直接尝试登录）')
    } else {
      router.push('/')
    }
  }

  const handleGuest = () => {
    continueAsGuest()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-2xl">
            🎓
          </div>
          <h1 className="text-xl font-bold text-white">AI 学职同伴</h1>
          <p className="mt-1 text-sm text-zinc-500">面向双非学生的 AI 成长陪伴</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {error && (
            <p className={`text-sm ${error.includes('成功') ? 'text-emerald-400' : 'text-red-400'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? '处理中…' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <p className="mt-3 text-center text-sm text-zinc-500">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            className="ml-1 text-emerald-400 hover:underline"
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>

        {/* 匿名继续 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-950 px-3 text-zinc-600">或</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGuest}
            className="mt-4 w-full rounded-lg border border-zinc-700 bg-transparent py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            跳过登录，继续使用
          </button>
          <p className="mt-2 text-center text-xs text-zinc-600">
            不登录也能正常使用，数据保存在本地浏览器
          </p>
        </div>
      </div>
    </div>
  )
}
