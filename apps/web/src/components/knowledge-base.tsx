'use client';

import { useEffect, useMemo, useState } from 'react';
import { panelCls } from '@/components/skill-ui';
import {
  Library,
  Upload,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Plus,
  Trash2,
  Pencil,
  MessageSquare,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  loadLibs,
  createLib,
  deleteLib,
  loadItems,
  saveKBItem,
  deleteKBItem,
  importFile,
  formatSize,
  KB_DEFAULT_LIB_ID,
  type KBItem,
  type KBLib,
} from '@/lib/kb';
import { canEditSystemLib, loadRole, ROLE_LABEL } from '@/lib/role';

function fileIcon(kind?: string) {
  if (kind === 'image') return <ImageIcon className="h-5 w-5" />;
  if (kind === 'pdf' || kind === 'docx' || kind === 'ppt') return <FileText className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}

export function KnowledgeBase() {
  const [libs, setLibs] = useState<KBLib[]>([]);
  const [activeLib, setActiveLib] = useState<string>(KB_DEFAULT_LIB_ID);
  const [items, setItems] = useState<KBItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<KBItem | null>(null);
  const [editing, setEditing] = useState<KBItem | null>(null);
  const [role, setRole] = useState<string>('student');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  const refresh = () => {
    setLibs(loadLibs());
    setItems(loadItems(activeLib));
    setRole(loadRole());
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setItems(loadItems(activeLib));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLib]);

  const activeLibMeta = useMemo(() => libs.find((l) => l.id === activeLib), [libs, activeLib]);
  const canEdit = canEditSystemLib(role as never) || !activeLibMeta?.protected;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const item = await importFile(f, activeLib);
      saveKBItem(item);
    }
    setItems(loadItems(activeLib));
  };

  const askDemo = () => {
    if (!query.trim()) return;
    setAnswer(
      `（示例回答）已基于「${activeLibMeta?.name ?? '知识库'}」检索「${query.trim()}」。真实语义检索待接入后端 Worker + bge-m3（见 项目说明.md B-1~B-4）。`
    );
  };

  return (
    <div className="space-y-5">
      {/* 库切换 */}
      <div className="flex flex-wrap items-center gap-2">
        {libs.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveLib(l.id)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ' +
              (l.id === activeLib
                ? 'bg-accent text-paper'
                : 'border border-ink/15 bg-paper text-ink/60 hover:text-ink')
            }
          >
            <Library className="h-3.5 w-3.5" />
            {l.name}
            {l.protected && <ShieldCheck className="h-3 w-3 text-amber-500" />}
          </button>
        ))}
        <button
          onClick={() => {
            const name = window.prompt('新建知识库名称');
            if (name) {
              const lib = createLib(name);
              setLibs(loadLibs());
              setActiveLib(lib.id);
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/20 px-3 py-1.5 text-sm text-ink/50 hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" /> 新建库
        </button>
      </div>

      <p className="text-xs text-ink/40">
        当前身份：{ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? '学生'}
        {activeLibMeta?.protected && !canEdit && ' · 系统库受保护，仅高校老师/维护员可编辑'}
      </p>

      {/* 文件导入 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={
          'rounded-2xl border-2 border-dashed p-6 text-center transition ' +
          (dragging ? 'border-accent bg-accent/5' : 'border-ink/15')
        }
      >
        <Upload className="mx-auto h-6 w-6 text-ink/30" />
        <p className="mt-2 text-sm text-ink/50">
          拖入或点击上传文件（doc / ppt / pdf / 图片）。图片与 PDF 支持浏览器内预览；
          docx/ppt 文本解析待接入后端。
        </p>
        <label className="mt-3 inline-block cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-paper">
          选择文件
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.ppt,.pptx,image/*,.txt,.md"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {/* 条目列表 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
            该知识库还没有内容。上传文件或手动添加条目。
          </div>
        )}
        {items.map((it) => (
          <div key={it.id} className={`${panelCls} p-4`}>
            <div className="flex items-start gap-2">
              <div className="text-accent">{fileIcon(it.fileKind)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{it.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">{it.summary}</p>
                {it.fileSize != null && (
                  <p className="mt-1 text-[11px] text-ink/30">{formatSize(it.fileSize)}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {(it.fileKind === 'image' || it.fileKind === 'pdf') && (
                <button
                  onClick={() => setPreview(it)}
                  className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/60 hover:text-ink"
                >
                  预览
                </button>
              )}
              {canEdit && (
                <>
                  <button
                    onClick={() => setEditing(it)}
                    className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/60 hover:text-ink"
                  >
                    <Pencil className="mr-1 inline h-3 w-3" />编辑
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`删除「${it.title}」？`)) {
                        deleteKBItem(it.id);
                        setItems(loadItems(activeLib));
                      }
                    }}
                    className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/60 hover:text-red-500"
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" />删除
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 手动添加条目 */}
      {canEdit && (
        <button
          onClick={() =>
            setEditing({
              id: '',
              libId: activeLib,
              title: '',
              kind: 'entry',
              summary: '',
              createdAt: 0,
              updatedAt: 0,
            })
          }
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/20 px-3 py-1.5 text-sm text-ink/50 hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" /> 手动添加条目
        </button>
      )}

      {/* 问答 UI 骨架 */}
      <section className={`${panelCls} p-5`}>
        <header className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold tracking-tight text-ink">向知识库提问</h2>
        </header>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`基于「${activeLibMeta?.name ?? '知识库'}」提问…`}
            className="flex-1 rounded-xl border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={askDemo}
            className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-paper"
          >
            <Sparkles className="h-4 w-4" /> 提问
          </button>
        </div>
        {answer && (
          <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-sm text-ink/70">
            {answer}
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink/30">
          真实检索链路待接入（Worker + bge-m3 向量化 + pgvector，依赖 B-1~B-4）。
        </p>
      </section>

      {/* 预览弹层 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-paper p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{preview.title}</p>
              <button onClick={() => setPreview(null)} className="text-ink/40 hover:text-ink">
                关闭
              </button>
            </div>
            {preview.fileKind === 'image' && preview.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.previewUrl} alt={preview.title} className="w-full rounded-xl" />
            )}
            {preview.fileKind === 'pdf' && preview.previewUrl && (
              <iframe src={preview.previewUrl} className="h-[70vh] w-full rounded-xl" />
            )}
            {preview.text && (
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs text-ink/60">
                {preview.text}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* 编辑/新增弹层 */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-paper p-5" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-semibold text-ink">
              {editing.id ? '编辑条目' : '新增条目'}
            </p>
            <input
              defaultValue={editing.title}
              id="kb-title"
              placeholder="标题"
              className="mb-2 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <textarea
              defaultValue={editing.summary}
              id="kb-summary"
              placeholder="摘要"
              className="mb-3 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-3 py-1.5 text-sm text-ink/50">
                取消
              </button>
              <button
                onClick={() => {
                  const title = (document.getElementById('kb-title') as HTMLInputElement).value;
                  const summary = (document.getElementById('kb-summary') as HTMLTextAreaElement).value;
                  const next: KBItem = {
                    ...editing,
                    title: title || '未命名',
                    summary,
                    updatedAt: Date.now(),
                  };
                  saveKBItem(next);
                  setItems(loadItems(activeLib));
                  setEditing(null);
                }}
                className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-paper"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
