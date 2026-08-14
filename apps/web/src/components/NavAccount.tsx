'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { LogIn, LogOut, UserCircle2 } from 'lucide-react'

export function NavAccount() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <span className="h-4 w-4 rounded-full bg-ink/10" />
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        title="退出登录"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-ink/60 transition hover:bg-ink/5 hover:text-ink"
      >
        <UserCircle2 className="h-4 w-4" />
        <span className="hidden md:inline max-w-[8rem] truncate">
          {session.user.name || session.user.email}
        </span>
        <LogOut className="h-4 w-4" />
      </button>
    )
  }

  return (
    <Link
      href="/login"
      title="登录"
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-ink/60 transition hover:bg-ink/5 hover:text-ink"
    >
      <LogIn className="h-4 w-4" />
      <span className="hidden md:inline">登录</span>
    </Link>
  )
}
