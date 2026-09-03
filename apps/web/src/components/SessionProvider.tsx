'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { FeedbackProvider } from '@/components/feedback-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <FeedbackProvider>{children}</FeedbackProvider>
    </SessionProvider>
  );
}
