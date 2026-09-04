'use client';

import { useRef, useState } from 'react';
import { panelCls } from '@/components/skill-ui';
import { NotebookPen, Trash2, Upload, FileText } from 'lucide-react';
import { loadNotes, saveNote, deleteNote, type InfoItem } from '@/lib/infobase';
import { loadRoleUser } from '@/lib/role';

/**
 * 我的笔记（private，localStorage）：双非学生成长所需的私有资料存储。
 * 与资源共享同一 InfoItem 模型，靠 visibility=private 区分（见 项目说明.md 数据模型）。
 * 支持：新建 / 导入（.txt .md）/ 点击预览编辑 / 删除。
 */
export function NotesPanel() {
  const user = loadRoleUser();
  const [notes, setNotes] = useState<InfoItem[]>(() => loadNotes(user.id));
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [viewing, setViewing] = useState<InfoItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function refresh() {
    setNotes(loadNotes(user.id));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !summary.trim()) return;
    saveNote({ title, summary }, user.id);
    setTitle('');
    setSummary('');
    refresh();
  }

  function importNote(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      saveNote({ title: file.name.replace(/\.[^.]+$/, ''), summary: text }, user.id);
      refresh();
    };
    reader.readAsText(file);
  }

  function remove(id: string) {
    deleteNote(id);
    refresh();
  }

  function saveViewing() {
    if (!viewing) return;
    const t = (document.getElementById('note-title') as HTMLInputElement)?.value ?? viewing.title;
    const b =
      (document.getElementById('note-body') as HTMLTextAreaElement)?.value ?? viewing.summary;
    saveNote({ title: t, summary: b }, user.id, viewing.id);
    setViewing(null);
    refresh();
  }

  const inputCls =
    'w-full rounded-xl border border-ink/15 bg-white/60 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink/30 focus:border-accent/50';

  return (
    <section className={`${panelCls} p-5`}>
      <header className="mb-4 flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold tracking-tight text-ink">我的笔记</h2>
        <span className="ml-auto text-xs text-ink/40">仅自己可见</span>
      </header>

      <form onSubmit={add} className="mb-4 space-y-2">
        <input
          className={inputCls}
          placeholder="笔记标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={inputCls}
          placeholder="笔记内容（私有，不外泄）"
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-paper transition hover:bg-[#c94a23]"
          >
            新建笔记
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink/60 transition hover:border-accent/40 hover:text-accent"
          >
            <Upload className="h-3.5 w-3.5" />
            导入笔记（.txt / .md）
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv"
            multiple
            className="hidden"
            onChange={(e) => {
              Array.from(e.target.files ?? []).forEach(importNote);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
          还没有笔记。把学校官网、教务处、比赛信息等随手记在这里，仅自己可见；也可点击「导入笔记」从本地文件导入。
        </div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-ink/5 bg-ink/[0.02] p-3"
            >
              <button
                type="button"
                onClick={() => setViewing(n)}
                className="flex flex-1 items-start gap-2 text-left"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent/70" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{n.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink/60">
                    {n.summary}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label="删除笔记"
                className="shrink-0 rounded-full p-1.5 text-ink/40 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 预览 / 编辑弹层 */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-paper p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-semibold text-ink">编辑笔记</p>
            <input
              id="note-title"
              defaultValue={viewing.title}
              placeholder="标题"
              className="mb-2 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <textarea
              id="note-body"
              defaultValue={viewing.summary}
              rows={8}
              placeholder="内容"
              className="mb-3 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  deleteNote(viewing.id);
                  setViewing(null);
                  refresh();
                }}
                className="rounded-full px-3 py-1.5 text-sm text-red-500"
              >
                删除
              </button>
              <button
                type="button"
                onClick={saveViewing}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-paper"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
