'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Sparkles,
  Building2,
  Library,
  MessagesSquare,
  User,
  ShieldCheck,
  HelpCircle,
  Settings,
  LogIn,
  type LucideIcon,
} from 'lucide-react';
import { showToast } from '@/lib/feedback';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: 'top' | 'bottom';
};

const TOP_NAV: NavItem[] = [
  { href: '/', label: '首页', icon: Home },
  { href: '/assistant', label: '助手', icon: Sparkles },
  { href: '/jobs', label: '信息中枢', icon: Building2 },
  { href: '/kb', label: '知识库', icon: Library },
  { href: '/community', label: '学职频道', icon: MessagesSquare },
  { href: '/profile', label: '成长', icon: User },
];

const BOTTOM_NAV: NavItem[] = [
  { href: '/admin', label: '管理员', icon: ShieldCheck },
  { href: '/help', label: '帮助', icon: HelpCircle },
  { href: '/settings', label: '设置', icon: Settings },
  { href: '/login', label: '登录', icon: LogIn },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/home';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent, item: NavItem) {
    if (isActive(pathname, item.href)) {
      e.preventDefault();
      showToast(`你已经在「${item.label}」页面了`, 'info', 1800);
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-ink/10 bg-paper/90 backdrop-blur transition lg:w-56">
      <div className="flex h-14 items-center gap-2 px-3 lg:px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-bold text-paper">
          AI
        </div>
        <span className="hidden font-serif text-sm font-bold text-ink lg:block">学职同伴</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-1">
          {TOP_NAV.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} onClick={handleClick} />
          ))}
        </ul>
        <div className="my-3 h-px bg-ink/10" />
        <ul className="space-y-1">
          {BOTTOM_NAV.map((item) => (
            <NavRow key={item.href} item={item} pathname={pathname} onClick={handleClick} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-ink/10 p-3">
        <p className="hidden text-[10px] leading-tight text-ink/30 lg:block">
          AI 学职同伴 · 面向双非学生的 AI Copilot
        </p>
      </div>
    </aside>
  );
}

function NavRow({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick: (e: React.MouseEvent, item: NavItem) => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={(e) => onClick(e, item)}
        className={
          'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ' +
          (active
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-ink/70 hover:bg-ink/5 hover:text-ink')
        }
        title={item.label}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{item.label}</span>
      </Link>
    </li>
  );
}
