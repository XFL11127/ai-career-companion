import type { ReactNode } from 'react'
import Link from 'next/link'
import { Radar, Route, Target, Newspaper, Briefcase } from 'lucide-react'

const NAV = [
  { href: '/diagnose', label: '诊断', icon: Radar },
  { href: '/plan', label: '路径', icon: Route },
  { href: '/practice', label: '练兵', icon: Target },
  { href: '/info', label: '信息差', icon: Newspaper },
  { href: '/package', label: '包装', icon: Briefcase },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
          <Link href="/" className="mr-3 font-serif font-bold text-ink">
            AI学职同伴
          </Link>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((n) => {
              const Icon = n.icon
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink/60 transition hover:bg-ink/5 hover:text-ink"
                >
                  <Icon className="h-4 w-4" /> {n.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
