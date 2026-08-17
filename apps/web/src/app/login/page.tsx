'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signUp, signIn, signInWithGitHub, continueAsGuest, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)

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

  const handleGitHub = async () => {
    setError('')
    setGithubLoading(true)
    const result = await signInWithGitHub()
    if (result.error) {
      setError(result.error)
      setGithubLoading(false)
    }
    // 成功后跳转到 GitHub 授权页，无需额外处理
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

        {/* 第三方 / 匿名继续 */}
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
            onClick={handleGitHub}
            disabled={githubLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/40 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            {githubLoading ? '正在跳转…' : '使用 GitHub 登录'}
          </button>
          <button
            type="button"
            onClick={handleGuest}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-transparent py-2.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
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
