/**
 * 学职频道数据层 — 帖子 / 评论求助 / 官方反馈（前端草稿，localStorage）
 *
 * 设计依据：项目说明.md「学职频道」。微信/QQ/公众号/学校 APP 为原生端，Web 仅构建
 * 社区模块 + 外部渠道引导卡 + 同步状态占位；真实多端发布与同步需后端（MoSCoW=Could）。
 */

export interface Post {
  id: string;
  title: string;
  body: string;
  tag: string;
  /** 分区：经验分享 / 求助答疑 / 资源对接 / 官方公告 */
  category: string;
  /** 是否为求助帖 */
  isHelp: boolean;
  /** 审核状态：机器人/管理员审核（MVP 下新帖默认待审核） */
  status: 'pending' | 'approved' | 'rejected';
  /** 附件（图文/视频/文件，MVP 仅存元数据，二进制待后端） */
  attachmentName?: string;
  attachmentKind?: 'image' | 'video' | 'file';
  author: string;
  createdAt: number;
}

/** 帖子分区（导航筛选用） */
export const POST_CATEGORIES = ['经验分享', '求助答疑', '资源对接', '官方公告'] as const;

/** 审核状态中文标签 */
export const POST_STATUS_LABEL: Record<Post['status'], string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export interface Comment {
  id: string;
  postId: string;
  body: string;
  author: string;
  createdAt: number;
}

export interface Feedback {
  id: string;
  content: string;
  contact?: string;
  createdAt: number;
  /** 官方回复（管理员在后台填写，公开展示于学职频道） */
  reply?: string;
  /** 官方回复时间 */
  replyAt?: number;
}

const POSTS_KEY = 'community_posts';
const COMMENTS_KEY = 'community_comments';
const FEEDBACK_KEY = 'community_feedback';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
    /* 静默降级 */
  }
}

export function loadPosts(): Post[] {
  return readList<Post>(POSTS_KEY).sort((a, b) => b.createdAt - a.createdAt);
}

export function savePost(post: Omit<Post, 'id' | 'createdAt'>): Post {
  const item: Post = { ...post, status: post.status ?? 'pending', id: uid(), createdAt: Date.now() };
  const list = loadPosts();
  list.unshift(item);
  writeList(POSTS_KEY, list);
  return item;
}

export function deletePost(id: string): void {
  writeList(
    POSTS_KEY,
    readList<Post>(POSTS_KEY).filter((p) => p.id !== id)
  );
  writeList(
    COMMENTS_KEY,
    readList<Comment>(COMMENTS_KEY).filter((c) => c.postId !== id)
  );
}

export function loadComments(postId: string): Comment[] {
  return readList<Comment>(COMMENTS_KEY)
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function addComment(postId: string, body: string, author: string): Comment {
  const item: Comment = { id: uid(), postId, body, author, createdAt: Date.now() };
  const list = loadComments(postId);
  list.push(item);
  writeList(COMMENTS_KEY, [...readList<Comment>(COMMENTS_KEY).filter((c) => c.postId !== postId), ...list]);
  return item;
}

export function saveFeedback(content: string, contact?: string): Feedback {
  const item: Feedback = { id: uid(), content, contact, createdAt: Date.now() };
  const list = readList<Feedback>(FEEDBACK_KEY);
  list.unshift(item);
  writeList(FEEDBACK_KEY, list);
  return item;
}

export function loadFeedbacks(): Feedback[] {
  return readList<Feedback>(FEEDBACK_KEY);
}

/** 官方回复用户反馈（管理员在后台填写，公开展示于学职频道） */
export function replyFeedback(id: string, reply: string): void {
  const list = readList<Feedback>(FEEDBACK_KEY).map((f) =>
    f.id === id
      ? { ...f, reply: reply.trim() || undefined, replyAt: reply.trim() ? Date.now() : undefined }
      : f
  );
  writeList(FEEDBACK_KEY, list);
}

/** 审核社区帖子：通过 / 驳回（管理员/老师在后台操作） */
export function reviewPost(id: string, decision: 'approved' | 'rejected'): void {
  const list = readList<Post>(POSTS_KEY).map((p) =>
    p.id === id ? { ...p, status: decision } : p
  );
  writeList(POSTS_KEY, list);
}

/** 外部渠道引导卡（原生端，Web 仅做入口与同步状态占位） */
export interface ChannelGuide {
  name: string;
  desc: string;
  url: string;
  /** 上次同步时间（占位，真实同步需后端每日一次） */
  lastSync: string;
}

export const CHANNEL_GUIDES: ChannelGuide[] = [
  { name: '微信小程序', desc: '掌上学职同伴，随时随地问', url: '#', lastSync: '待接入' },
  { name: 'QQ 频道', desc: '双非互助社群，实时交流', url: '#', lastSync: '待接入' },
  { name: '微信公众号', desc: '干货推送与官方解读', url: '#', lastSync: '待接入' },
  { name: '学校官方 APP', desc: '对接本校就业服务', url: '#', lastSync: '待接入' },
];
