import type { Metadata } from 'next';
import { InsightDashboard } from '@/components/insight-dashboard';

export const metadata: Metadata = {
  title: 'AI 学职需求洞察大屏',
  description: '基于 174 份问卷的大学生 AI 学职需求分层与功能匹配可视化分析',
};

export default function InsightPage() {
  return <InsightDashboard />;
}
