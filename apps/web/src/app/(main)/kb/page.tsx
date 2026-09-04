'use client';

import { useState } from 'react';
import { Library, NotebookPen } from 'lucide-react';
import { KnowledgeBase } from '@/components/knowledge-base';
import { NotesPanel } from '@/components/notes-panel';

const TABS = [
  { key: 'items', label: '文件与条目', icon: Library },
  { key: 'notes', label: '我的笔记', icon: NotebookPen },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState<TabKey>('items');

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-5">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">知识库</h1>
        <p className="mt-1 text-sm text-ink/50">
          知识库帮助你管理文件：可以上传文件、导入笔记、手动维护条目，并可直接向知识库提问。
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-ink/10 pb-3">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                active ? 'bg-accent text-paper' : 'text-ink/60 hover:bg-ink/[0.04] hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'items' && <KnowledgeBase />}
      {tab === 'notes' && <NotesPanel />}
    </main>
  );
}
