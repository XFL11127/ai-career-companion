'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Next.js 全局错误边界（根 Error Boundary）。
 * 当渲染过程中出现未捕获错误时兜底，避免白屏。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 生产环境可替换为 Sentry / 日志服务
    // eslint-disable-next-line no-console
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-background text-ink">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-xl">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="font-serif text-2xl font-bold text-ink">页面出了点小问题</h1>
            <p className="mt-2 text-sm text-ink/60">
              我们已收到错误反馈，你可以尝试刷新或返回首页。
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-ink/30 font-mono">Error ID: {error.digest}</p>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper transition hover:bg-[#c94a23]"
              >
                <RotateCcw className="h-4 w-4" />
                重试
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
              >
                <Home className="h-4 w-4" />
                回首页
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
