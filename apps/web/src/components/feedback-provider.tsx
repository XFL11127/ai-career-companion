'use client';

import { ToastContainer } from '@/components/toast';

/** 在应用根节点注入 Toast 容器，使 lib/feedback 的提示能够全局渲染。 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
