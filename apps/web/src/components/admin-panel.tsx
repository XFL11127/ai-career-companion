'use client';

import { useEffect, useState } from 'react';
import { panelCls } from '@/components/skill-ui';
import {
  ShieldCheck,
  Check,
  X,
  Users,
  Kanban,
  KeyRound,
  Download,
  Upload,
  Lock,
  Megaphone,
} from 'lucide-react';
import { loadContributions, reviewContribution, type InfoItem } from '@/lib/infobase';
import {
  loadFeedbacks,
  loadPosts,
  reviewPost,
  replyFeedback,
  POST_STATUS_LABEL,
  type Feedback,
  type Post,
} from '@/lib/community';
import {
  loadRole,
  setRole,
  TEST_ACCOUNTS,
  canReview,
  canConfigBackend,
  ROLE_LABEL,
  type AppRole,
} from '@/lib/role';

type AdminTab = 'review' | 'progress' | 'users' | 'config' | 'feedback';

const HANDLED_KEY = 'admin_handled_feedback';

interface AdminTask {
  id: string;
  title: string;
  col: 'todo' | 'doing' | 'done';
}

const TASKS_KEY = 'admin_tasks';

function seedTasks(): AdminTask[] {
  return [
    { id: 't1', title: '语义检索链路接通（B-1~B-4）', col: 'todo' },
    { id: 't2', title: 'Supabase Auth 接入真实账号', col: 'todo' },
    { id: 't3', title: '信息中枢前端骨架', col: 'done' },
  ];
}

export function AdminPanel() {
  const [tab, setTab] = useState<AdminTab>('review');
  const [role, setRoleState] = useState<AppRole>('student');
  const [contribs, setContribs] = useState<InfoItem[]>([]);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [handled, setHandled] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  const refreshContribs = () => setContribs(loadContributions());
  const refreshPosts = () => setPosts(loadPosts());

  useEffect(() => {
    setRoleState(loadRole());
    refreshContribs();
    refreshPosts();
    setFeedbacks(loadFeedbacks());
    const h = localStorage.getItem(HANDLED_KEY);
    setHandled(h ? (JSON.parse(h) as string[]) : []);
    const t = localStorage.getItem(TASKS_KEY);
    setTasks(t ? (JSON.parse(t) as AdminTask[]) : seedTasks());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleHandled = (id: string) => {
    const next = handled.includes(id) ? handled.filter((x) => x !== id) : [...handled, id];
    setHandled(next);
    localStorage.setItem(HANDLED_KEY, JSON.stringify(next));
  };

  const persistTasks = (next: AdminTask[]) => {
    setTasks(next);
    localStorage.setItem(TASKS_KEY, JSON.stringify(next));
  };

  if (role === 'student') {
    return (
      <div className="rounded-2xl border border-amber-300/40 bg-amber-50 p-6 text-center text-sm text-ink/70">
        <Lock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
        管理员后台仅对「高校老师 / 系统维护员」开放。请到「设置」切换测试账号身份后查看。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['review', '审核队列', ShieldCheck],
            ['progress', '进度协调', Kanban],
            ['users', '用户管理', Users],
            ['config', '后台配置', KeyRound],
            ['feedback', '官方反馈', Megaphone],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ' +
              (tab === key
                ? 'bg-accent text-paper'
                : 'border border-ink/15 bg-paper text-ink/60 hover:text-ink')
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'review' && (
        <>
          <div className="space-y-3">
            {contribs.length === 0 && (
              <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
                暂无贡献待处理。
              </div>
            )}
            {contribs.map((c) => (
              <div key={c.id} className={`${panelCls} p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">{c.summary}</p>
                    <p className="mt-1 text-[11px] text-ink/30">
                      {c.url} · 状态：
                      <span
                        className={
                          c.status === 'pending'
                            ? 'text-amber-600'
                            : c.status === 'published'
                              ? 'text-green-600'
                              : 'text-red-500'
                        }
                      >
                        {c.status === 'pending'
                          ? '待审核'
                          : c.status === 'published'
                            ? '已发布'
                            : '已驳回'}
                      </span>
                    </p>
                  </div>
                  {c.status === 'pending' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => {
                          reviewContribution(c.id, 'published');
                          refreshContribs();
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs text-white"
                      >
                        <Check className="h-3 w-3" /> 通过
                      </button>
                      <button
                        onClick={() => {
                          reviewContribution(c.id, 'rejected');
                          refreshContribs();
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs text-white"
                      >
                        <X className="h-3 w-3" /> 驳回
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-dashed border-ink/15 pt-4">
            <p className="mb-3 text-xs font-medium text-ink/50">帖子审核（学职频道用户发帖）</p>
            {posts.filter((p) => p.status === 'pending').length === 0 && (
              <div className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink/40">
                暂无待审核帖子。
              </div>
            )}
            {posts
              .filter((p) => p.status === 'pending')
              .map((p) => (
                <div key={p.id} className={`${panelCls} p-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">{p.body}</p>
                      <p className="mt-1 text-[11px] text-ink/30">
                        {p.author} · {p.category} · {new Date(p.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => {
                          reviewPost(p.id, 'approved');
                          refreshPosts();
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs text-white"
                      >
                        <Check className="h-3 w-3" /> 通过
                      </button>
                      <button
                        onClick={() => {
                          reviewPost(p.id, 'rejected');
                          refreshPosts();
                        }}
                        className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs text-white"
                      >
                        <X className="h-3 w-3" /> 驳回
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            {posts.some((p) => p.status !== 'pending') && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-ink/40">
                  查看已处理帖子（{posts.filter((p) => p.status !== 'pending').length}）
                </summary>
                <div className="mt-2 space-y-2">
                  {posts
                    .filter((p) => p.status !== 'pending')
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-ink/10 p-2 text-xs text-ink/60"
                      >
                        <span className="truncate">{p.title}</span>
                        <span
                          className={p.status === 'approved' ? 'text-green-600' : 'text-red-500'}
                        >
                          {POST_STATUS_LABEL[p.status]}
                        </span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        </>
      )}

      {tab === 'progress' && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(['todo', 'doing', 'done'] as const).map((col) => (
            <div key={col} className="rounded-2xl border border-ink/10 bg-paper p-3">
              <p className="mb-2 text-xs font-medium text-ink/50">
                {col === 'todo' ? '待办' : col === 'doing' ? '进行中' : '已完成'}
              </p>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.col === col)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-ink/10 p-2 text-sm text-ink/70"
                    >
                      {t.title}
                      <div className="mt-1 flex gap-1">
                        {(['todo', 'doing', 'done'] as const)
                          .filter((c) => c !== col)
                          .map((c) => (
                            <button
                              key={c}
                              onClick={() =>
                                persistTasks(
                                  tasks.map((x) => (x.id === t.id ? { ...x, col: c } : x))
                                )
                              }
                              className="rounded bg-ink/5 px-1.5 py-0.5 text-[11px] text-ink/50 hover:text-ink"
                            >
                              →{c === 'todo' ? '待办' : c === 'doing' ? '进行' : '完成'}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <p className="col-span-full text-[11px] text-ink/30">
            进度数据为本前端演示（localStorage）；真实项目管理与跨端同步需后端。可对接
            docs/TASKBOARD.md 视图。
          </p>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-2">
          {TEST_ACCOUNTS.map((a) => (
            <div key={a.id} className={`${panelCls} flex items-center justify-between p-3`}>
              <div>
                <p className="text-sm font-medium text-ink">{a.name}</p>
                <p className="text-xs text-ink/50">
                  {ROLE_LABEL[a.role]} · {a.desc}
                </p>
              </div>
              <button
                onClick={() => {
                  setRole(a.role);
                  setRoleState(a.role);
                }}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-medium ' +
                  (role === a.role ? 'bg-accent text-paper' : 'border border-ink/15 text-ink/60')
                }
              >
                {role === a.role ? '当前' : '切换为此身份'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'config' && (
        <div className="space-y-4">
          {!canConfigBackend(role) && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              检索 Key 配置与数据备份仅「系统维护员」可操作。
            </p>
          )}
          <div className={`${panelCls} p-4`}>
            <p className="mb-2 text-sm font-medium text-ink">检索 Key 配置</p>
            <input
              disabled
              placeholder="博查 / DeepSeek 联网 Key（待接入后端）"
              className="w-full rounded-xl border border-ink/15 bg-ink/5 px-3 py-2 text-sm text-ink/40"
            />
            <p className="mt-1 text-[11px] text-ink/30">
              真实 Key 由后端环境变量承载（env.AI / 博查），前端不存储密钥。
            </p>
          </div>
          <div className={`${panelCls} p-4`}>
            <p className="mb-2 text-sm font-medium text-ink">数据备份 / 恢复</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const dump = JSON.stringify({
                    infobase_resources: localStorage.getItem('infobase_resources'),
                    infobase_contributions: localStorage.getItem('infobase_contributions'),
                    infobase_notes: localStorage.getItem('infobase_notes'),
                    kb_libs: localStorage.getItem('kb_libs'),
                    kb_items: localStorage.getItem('kb_items'),
                    community_posts: localStorage.getItem('community_posts'),
                    community_comments: localStorage.getItem('community_comments'),
                    community_feedback: localStorage.getItem('community_feedback'),
                  });
                  const blob = new Blob([dump], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'aicc-backup.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-paper"
              >
                <Download className="h-4 w-4" /> 导出备份
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink/60">
                <Upload className="h-4 w-4" /> 导入恢复
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    f.text().then((txt) => {
                      try {
                        const data = JSON.parse(txt);
                        Object.entries(data).forEach(([k, v]) => {
                          if (v) localStorage.setItem(k, v as string);
                        });
                        alert('已恢复（演示）');
                        refreshContribs();
                      } catch {
                        alert('文件格式错误');
                      }
                    });
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedbacks.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
              暂无官方反馈。用户可在「学职频道 → 官方反馈」提交。
            </div>
          )}
          {feedbacks.map((f) => (
            <FeedbackRow
              key={f.id}
              f={f}
              done={handled.includes(f.id)}
              onToggle={toggleHandled}
              onReplied={() => setFeedbacks(loadFeedbacks())}
            />
          ))}
          <p className="text-[11px] text-ink/30">
            处理记录存于本地（localStorage）；真实工单系统需后端。
          </p>
        </div>
      )}
    </div>
  );
}

function FeedbackRow({
  f,
  done,
  onToggle,
  onReplied,
}: {
  f: Feedback;
  done: boolean;
  onToggle: (id: string) => void;
  onReplied: () => void;
}) {
  const [reply, setReply] = useState(f.reply ?? '');
  return (
    <div className={`${panelCls} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="whitespace-pre-wrap text-sm text-ink/80">{f.content}</p>
          <p className="mt-1 text-[11px] text-ink/30">
            {f.contact ? `联系：${f.contact} · ` : ''}
            {new Date(f.createdAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(f.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
            done ? 'bg-ink/5 text-ink/50' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {done ? '已处理 · 撤销' : '标记已处理'}
        </button>
      </div>
      <div className="mt-3 border-t border-ink/10 pt-3">
        <p className="mb-1 text-[11px] font-medium text-ink/40">官方回复（将公开展示在学职频道）</p>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="以官方身份回复用户…"
          className="mb-2 h-16 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            replyFeedback(f.id, reply);
            onReplied();
          }}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-paper"
        >
          保存回复
        </button>
      </div>
    </div>
  );
}
