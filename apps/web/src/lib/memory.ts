// L2 交互记忆：localStorage 存储用户画像摘要（跨会话持久化，纯前端实现）。
export function saveUserProfile(summary: string): void {
  localStorage.setItem('user_profile', summary);
}

export function getUserProfile(): string | null {
  return localStorage.getItem('user_profile');
}

// 免登模型下的稳定匿名 ID：用于 Supabase 按浏览器分桶（记忆/看板数据隔离）。
const ANON_ID = 'anon_user_id';
export function getAnonUserId(): string {
  if (typeof window === 'undefined') return 'anon';
  let id = window.localStorage.getItem(ANON_ID);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ANON_ID, id);
  }
  return id;
}

// ---------- 连续活跃天数（streak）----------
// 规则：完成一次 Skill 调用才计为「活跃一天」，当天重复不累加。
// 由 useChat/useSkill 在调用成功后调用 bumpStreak()，侧边栏仅读取展示。
const STREAK_LAST = 'streak-last-active';
const STREAK_COUNT = 'streak-count';

export function getStreak(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(window.localStorage.getItem(STREAK_COUNT) || '0', 10) || 0;
}

export function bumpStreak(): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  const last = window.localStorage.getItem(STREAK_LAST);
  const cur = parseInt(window.localStorage.getItem(STREAK_COUNT) || '0', 10) || 0;
  if (last === today) return; // 今天已记过，不重复累加
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const next = last === yesterday ? cur + 1 : 1;
  window.localStorage.setItem(STREAK_LAST, today);
  window.localStorage.setItem(STREAK_COUNT, String(next));
}

// L1 会话记忆：IndexedDB 按 skill 存储对话轮次（免登即用，数据存浏览器本地）。
// 与 db.ts 的「结果缓存」区分：这里存的是「会话上下文」（input+output 轮次），用于注入 prompt。

const DB_NAME = 'ai-career-companion';
const STORE = 'skill_memory';
const VERSION = 2; // 升级：新增 skill_memory store
const MAX_TURNS = 20; // 单 skill 最多保留轮次

export interface MemoryTurn {
  input: unknown;
  output: unknown;
  ts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function summarize(v: unknown): string {
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  } catch {
    return '';
  }
}

function getTurns(db: IDBDatabase, skill: string): Promise<MemoryTurn[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(skill);
    req.onsuccess = () => resolve((req.result as MemoryTurn[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
}

function putTurns(db: IDBDatabase, skill: string, value: MemoryTurn[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, skill);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 追加一轮对话（调用 Skill 后调用）。 */
export async function appendTurn(skill: string, turn: MemoryTurn): Promise<void> {
  const db = await openDB();
  try {
    const prev = await getTurns(db, skill);
    const next = [...prev, turn].slice(-MAX_TURNS);
    await putTurns(db, skill, next);
  } finally {
    db.close();
  }
}

/** 召回最近 limit 轮（调用 Skill 前调用，用于注入 prompt）。 */
export async function recallTurns(skill: string, limit = 5): Promise<MemoryTurn[]> {
  const db = await openDB();
  try {
    const all = await getTurns(db, skill);
    return all.slice(-limit);
  } finally {
    db.close();
  }
}

/** 把轮次转成可读的上下文字符串数组，注入 LLM prompt。 */
export function turnsToContext(turns: MemoryTurn[]): string[] {
  return turns.map((t) => `用户：${summarize(t.input)}\nAI：${summarize(t.output)}`);
}

// ---------- 聊天消息流（可见 transcript，按 skill 分桶）----------
// 与上面的「L1 轮次」并存：这里存的是用户能看到的完整对话历史（用于 Kimi 式聊天界面渲染 + 注入上下文）。

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string; // 用户输入 或 AI 的 reply 散文
  card?: unknown | null; // AI 的结构化卡片（流式过程中为 partial）
  skill?: string;
  done?: boolean;
  ts: number;
}

const CHAT_PREFIX = 'chat:';
const MAX_MESSAGES = 60;

function getChat<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function putChat(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 读取某 Skill 的完整消息流（用于渲染历史 transcript）。 */
export async function loadMessages(skill: string): Promise<ChatMessage[]> {
  const db = await openDB();
  try {
    return (await getChat<ChatMessage[]>(db, CHAT_PREFIX + skill)) ?? [];
  } finally {
    db.close();
  }
}

/** 追加一条消息（用户发送或 AI 完成/流式更新后调用）。 */
export async function appendMessage(skill: string, msg: ChatMessage): Promise<void> {
  const db = await openDB();
  try {
    const prev = (await getChat<ChatMessage[]>(db, CHAT_PREFIX + skill)) ?? [];
    const next = [...prev, msg].slice(-MAX_MESSAGES);
    await putChat(db, CHAT_PREFIX + skill, next);
  } finally {
    db.close();
  }
}

/** 覆盖保存某 Skill 的完整消息流（从历史会话恢复时使用）。 */
export async function saveMessages(skill: string, messages: ChatMessage[]): Promise<void> {
  const db = await openDB();
  try {
    await putChat(db, CHAT_PREFIX + skill, messages);
  } finally {
    db.close();
  }
}

/** 清空某 Skill 的对话（用户点「清空」）。 */
export async function clearMessages(skill: string): Promise<void> {
  const db = await openDB();
  try {
    await putChat(db, CHAT_PREFIX + skill, []);
  } finally {
    db.close();
  }
}

// ---------- 会话历史（Kimi 式侧边栏）----------
// 每个会话 = 一个 Skill 下的完整 transcript，支持跨 Skill 归档、按时间分组展示。

export interface Conversation {
  id: string;
  skill: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const CONVERSATIONS_KEY = 'conversations';
const MAX_CONVERSATIONS = 100;

function makeTitle(msgs: ChatMessage[]): string {
  const firstUser = msgs.find((m) => m.role === 'user');
  const raw = firstUser?.content?.trim() ?? '';
  if (!raw) return '新会话';
  const t = raw.slice(0, 24);
  return t.length < raw.length ? `${t}…` : t;
}

export async function loadConversations(): Promise<Conversation[]> {
  const db = await openDB();
  try {
    const list = (await getChat<Conversation[]>(db, CONVERSATIONS_KEY)) ?? [];
    return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function archiveCurrentConversation(
  skill: string,
  messages: ChatMessage[]
): Promise<void> {
  if (!messages.length) return;
  const db = await openDB();
  try {
    const list = (await getChat<Conversation[]>(db, CONVERSATIONS_KEY)) ?? [];
    const conv: Conversation = {
      id: crypto.randomUUID(),
      skill,
      title: makeTitle(messages),
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [conv, ...list].slice(0, MAX_CONVERSATIONS);
    await putChat(db, CONVERSATIONS_KEY, next);
  } finally {
    db.close();
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await openDB();
  try {
    const list = (await getChat<Conversation[]>(db, CONVERSATIONS_KEY)) ?? [];
    const next = list.filter((c) => c.id !== id);
    await putChat(db, CONVERSATIONS_KEY, next);
  } finally {
    db.close();
  }
}

/** 把旧版“每 Skill 一份当前聊天”数据迁移成会话列表（一次性）。 */
export async function migrateLegacyChats(skills: string[]): Promise<void> {
  const db = await openDB();
  try {
    const existing = (await getChat<Conversation[]>(db, CONVERSATIONS_KEY)) ?? [];
    if (existing.length > 0) return;
    const convs: Conversation[] = [];
    for (const skill of skills) {
      const messages = (await getChat<ChatMessage[]>(db, CHAT_PREFIX + skill)) ?? [];
      if (messages.length) {
        convs.push({
          id: crypto.randomUUID(),
          skill,
          title: makeTitle(messages),
          messages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    if (convs.length) await putChat(db, CONVERSATIONS_KEY, convs);
  } finally {
    db.close();
  }
}
