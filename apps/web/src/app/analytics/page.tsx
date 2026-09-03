import { redirect } from 'next/navigation';

/**
 * 数据看板已与「成长」融合（见 app/(main)/profile）。
 * 保留 /analytics 路径兼容性，统一重定向到 /profile。
 */
export default function AnalyticsPage() {
  redirect('/profile');
}
