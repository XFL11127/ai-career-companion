'use client'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-ink/10 bg-paper/80 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-bold text-ink">登录功能开发中</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          账号体系正在打磨中。当前所有对话均<strong className="text-ink">免登录本地保存</strong>
          （存于你的浏览器 IndexedDB），无需登录即可使用全部学职 Skill。
        </p>

        <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-ink/[0.02] px-4 py-3 text-left text-xs leading-relaxed text-ink/55">
          <p className="font-medium text-ink/70">即将支持</p>
          <ul className="mt-1.5 space-y-1">
            <li>· 跨设备同步你的学职会话与画像</li>
            <li>· 双非垂直记忆的云端持久化</li>
            <li>· 团队协作与导师连线</li>
          </ul>
        </div>

        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-[#c94a23]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回对话
        </Link>
      </div>

      <p className="mt-6 text-xs text-ink/40">AI学职同伴 · 面向双非学生的学职陪伴 Copilot</p>
    </main>
  )
}
