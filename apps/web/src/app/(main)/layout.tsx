import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Radar,
  Route,
  Target,
  Newspaper,
  Briefcase,
  Home,
  BarChart3,
  HelpCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { NavAccount } from '@/components/NavAccount'

const SKILL_NAV = [
  { href: '/diagnose', label: '诊断', icon: Radar },
  { href: '/plan', label: '路径', icon: Route },
  { href: '/practice', label: '练兵', icon: Target },
  { href: '/info', label: '信息差', icon: Newspaper },
  { href: '/package', label: '包装', icon: Briefcase },
]

type NavItem = { href: string; label: string; icon: LucideIcon; button?: boolean }

const UTIL_NAV: NavItem[] = [
  { href: '/', label: '首页', icon: Home, button: true },
  { href: '/analytics', label: '数据看板', icon: BarChart3 },
  { href: '/help', label: '帮助', icon: HelpCircle },
  { href: '/settings', label: '设置', icon: Settings },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link
            href="/"
            className="mr-1 flex shrink-0 items-center gap-1.5 font-serif font-bold text-ink"
            title="首页"
          >
            <Home className="h-4 w-4" /> <span className="hidden sm:inline">AI学职同伴</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {SKILL_NAV.map((n) => {
              const Icon = n.icon
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-ink/60 transition hover:bg-ink/5 hover:text-ink"
                >
                  <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{n.label}</span>
                </Link>
              )
            })}
          </nav>
          <nav className="flex shrink-0 items-center gap-0.5">
            {UTIL_NAV.map((n) => {
              const Icon = n.icon
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition hover:bg-ink/5 hover:text-ink ' +
                    (n.button
                      ? 'border border-ink/15 bg-paper font-medium text-ink'
                      : 'text-ink/60')
                  }
                  title={n.label}
                >
                  <Icon className="h-4 w-4" />{' '}
                  <span className={n.button ? 'hidden sm:inline' : 'hidden md:inline'}>
                    {n.label}
                  </span>
                </Link>
              )
            })}
            <NavAccount />
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
