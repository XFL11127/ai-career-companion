/**
 * 知识库数据层 — 用户知识库 / 库集合 / 文件导入（前端草稿，localStorage）
 *
 * 设计依据：项目说明.md「知识库大体系」「资源库作为特殊默认 KB」。
 * - 资源库即一个 isDefault=true 的受保护库（系统库），用户自建库为辅助。
 * - 文件导入：图片/PDF 用浏览器原生 object-URL 预览；docx/pptx 存元数据，文本解析标注「待接入」
 *   （真实分块+向量化需后端 Worker + bge-m3，见 项目说明.md 资源库调用技术线 B-1~B-4）。
 * - 与 infobase.ts 同模式：Supabase 就绪后仅替换本文件读写实现，页面不动。
 */

export type KBItemKind = 'file' | 'entry';
export type FileKind = 'pdf' | 'docx' | 'ppt' | 'image' | 'other' | 'text';

export interface KBItem {
  id: string;
  libId: string;
  title: string;
  kind: KBItemKind;
  fileKind?: FileKind;
  fileName?: string;
  fileSize?: number;
  /** 导入时尽力抽取的文本（纯文本可读；其余格式待接入后端解析） */
  text?: string;
  summary: string;
  /** 本次会话内的预览 URL（不持久化，刷新后失效） */
  previewUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KBLib {
  id: string;
  name: string;
  /** 系统默认库（资源库），受保护 */
  isDefault?: boolean;
  protected?: boolean;
  ownerRole?: string;
}

const LIBS_KEY = 'kb_libs';
const ITEMS_KEY = 'kb_items';
const DEFAULT_LIB_ID = 'kb_sys_resource';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readList<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: unknown[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* 配额/隐私模式静默降级 */
  }
}

function ensureSeed(): void {
  if (!isBrowser()) return;
  const libs = readList<KBLib>(LIBS_KEY);
  if (libs.length === 0) {
    writeList(LIBS_KEY, [
      { id: DEFAULT_LIB_ID, name: '资源库（默认）', isDefault: true, protected: true, ownerRole: 'teacher' },
    ]);
  }
}

export function loadLibs(): KBLib[] {
  ensureSeed();
  return readList<KBLib>(LIBS_KEY);
}

export function loadLib(id: string): KBLib | undefined {
  return loadLibs().find((l) => l.id === id);
}

export function createLib(name: string): KBLib {
  const lib: KBLib = { id: uid(), name: name.trim() || '我的知识库' };
  const libs = loadLibs();
  libs.push(lib);
  writeList(LIBS_KEY, libs);
  return lib;
}

export function deleteLib(id: string): void {
  if (id === DEFAULT_LIB_ID) return; // 默认库不可删
  writeList(
    LIBS_KEY,
    loadLibs().filter((l) => l.id !== id)
  );
  writeList(
    ITEMS_KEY,
    readList<KBItem>(ITEMS_KEY).filter((i) => i.libId !== id)
  );
}

export function loadItems(libId: string): KBItem[] {
  return readList<KBItem>(ITEMS_KEY)
    .filter((i) => i.libId === libId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveKBItem(item: KBItem): void {
  const list = loadItems(item.libId).filter((i) => i.id !== item.id);
  list.unshift({ ...item, updatedAt: Date.now() });
  const all = readList<KBItem>(ITEMS_KEY).filter((i) => i.libId !== item.libId);
  writeList(ITEMS_KEY, [...all, ...list]);
}

export function deleteKBItem(id: string): void {
  writeList(
    ITEMS_KEY,
    readList<KBItem>(ITEMS_KEY).filter((i) => i.id !== id)
  );
}

function detectFileKind(name: string, type: string): FileKind {
  const n = name.toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/.test(n)) return 'image';
  if (type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.ppt') || n.endsWith('.pptx')) return 'ppt';
  if (type.startsWith('text/') || n.endsWith('.txt') || n.endsWith('.md')) return 'text';
  return 'other';
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatSize(bytes: number): string {
  return fmtSize(bytes);
}

/**
 * 导入一个文件：生成会话内预览 URL（图片/PDF 原生渲染），尽量抽取文本。
 * 返回 KBItem（previewUrl 仅本次会话有效）。
 */
export async function importFile(
  file: File,
  libId: string,
  opts?: { onPreviewUrl?: (url: string) => void }
): Promise<KBItem> {
  const fileKind = detectFileKind(file.name, file.type);
  let previewUrl: string | undefined;
  let text: string | undefined;

  if (fileKind === 'image' || fileKind === 'pdf') {
    previewUrl = URL.createObjectURL(file);
    opts?.onPreviewUrl?.(previewUrl);
  }

  if (fileKind === 'text') {
    try {
      text = await file.text();
    } catch {
      text = undefined;
    }
  }
  // docx/ppt：文本解析待接入（需 mammoth / pptx 解析库，前端沙箱未装；真实分块向量化在后端）

  const item: KBItem = {
    id: uid(),
    libId,
    title: file.name,
    kind: 'file',
    fileKind,
    fileName: file.name,
    fileSize: file.size,
    text,
    summary:
      fileKind === 'image' || fileKind === 'pdf'
        ? '支持浏览器内预览（图片/PDF）。'
        : fileKind === 'text'
          ? '纯文本已可读，可并入知识库检索。'
          : '文本解析待接入（docx/ppt 需后端分块向量化）。',
    previewUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return item;
}

export const KB_DEFAULT_LIB_ID = DEFAULT_LIB_ID;
