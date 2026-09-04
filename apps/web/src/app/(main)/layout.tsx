import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';

/**
 * (main) 分组统一布局：左侧全局侧边栏导航（已聚合五 Skill 为单一「助手」入口）。
 * 顶部导航栏内容已迁移到侧边栏，保持界面简洁。
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
