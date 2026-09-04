'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { subscribe, removeToast, type ToastMessage } from '@/lib/feedback';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
};

const STYLES: Record<ToastMessage['type'], string> = {
  info: 'bg-ink/5 text-ink border-ink/10',
  success: 'bg-forest/10 text-forest border-forest/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-600 border-red-200',
};

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribe(setMessages);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed right-4 top-16 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {messages.map((m) => {
        const Icon = ICONS[m.type];
        return (
          <div
            key={m.id}
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 rounded-xl border p-3 shadow-lg backdrop-blur transition ${STYLES[m.type]}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm">{m.message}</span>
            <button
              type="button"
              onClick={() => removeToast(m.id)}
              className="rounded p-1 opacity-60 hover:opacity-100"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
