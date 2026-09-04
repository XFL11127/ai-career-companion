'use client';

import { SidebarNav } from '@/components/sidebar-nav';

/**
 * 统一应用外壳：左侧固定侧边栏 + 右侧主内容区。
 * 用于首页与 (main) 分组下的所有页面，保证导航体验一致。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background lg:pl-56">
      <SidebarNav />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
