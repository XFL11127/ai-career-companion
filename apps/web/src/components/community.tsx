'use client';

import { useEffect, useRef, useState } from 'react';
import { panelCls } from '@/components/skill-ui';
import {
  MessageSquare,
  HelpCircle,
  Send,
  Megaphone,
  ExternalLink,
  Plus,
  Trash2,
  User,
  Paperclip,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import {
  loadPosts,
  savePost,
  deletePost,
  loadComments,
  addComment,
  saveFeedback,
  loadFeedbacks,
  CHANNEL_GUIDES,
  POST_CATEGORIES,
  POST_STATUS_LABEL,
  type Post,
  type Feedback,
} from '@/lib/community';
import { loadRoleUser } from '@/lib/role';

type Tab = 'feed' | 'post' | 'mine' | 'feedback' | 'channels';

function StatusBadge({ status }: { status: Post['status'] }) {
  const map = {
    pending: { cls: 'bg-amber-100 text-amber-700', icon: Clock, label: POST_STATUS_LABEL.pending },
    approved: { cls: 'bg-forest/10 text-forest', icon: CheckCircle2, label: POST_STATUS_LABEL.approved },
    rejected: { cls: 'bg-red-50 text-red-600', icon: ShieldCheck, label: POST_STATUS_LABEL.rejected },
  } as const;
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${m.cls}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function AttachmentChip({ name, kind }: { name?: string; kind?: Post['attachmentKind'] }) {
  if (!name) return null;
  const Icon = kind === 'image' ? ImageIcon : Paperclip;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-ink/50">
      <Icon className="h-3 w-3" />
      {name}
    </span>
  );
}

export function CommunityModule() {
  const [tab, setTab] = useState<Tab>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [catFilter, setCatFilter] = useState<string>('全部');
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [me, setMe] = useState('我');

  useEffect(() => {
    setPosts(loadPosts());
    setMe(loadRoleUser().name);
  }, []);

  const filtered = catFilter === '全部' ? posts : posts.filter((p) => p.category === catFilter);
  const myPosts = posts.filter((p) => p.author === me);

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
    { key: 'feed', label: '帖子广场', icon: MessageSquare },
    { key: 'post', label: '发布帖子', icon: Plus },
    { key: 'mine', label: '我的主页', icon: User },
    { key: 'feedback', label: '官方反馈', icon: Megaphone },
    { key: 'channels', label: '外部渠道', icon: ExternalLink },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ' +
              (tab === key ? 'bg-accent text-paper' : 'border border-ink/15 bg-paper text-ink/60 hover:text-ink')
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {['全部', ...POST_CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`rounded-full px-2.5 py-1 text-xs transition ${
                  catFilter === c ? 'bg-ink/10 text-ink' : 'border border-ink/10 text-ink/50 hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
                还没有帖子。去「发布帖子」分享你的双非求职经验或求助。
              </div>
            )}
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setOpenPost(p)} className={`${panelCls} p-4 text-left transition hover:border-accent/40`}>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-ink/50">{p.category}</span>
                  {p.isHelp && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
                      <HelpCircle className="h-3 w-3" /> 求助
                    </span>
                  )}
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-ink">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink/50">{p.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/30">
                  <span>{p.author} · {new Date(p.createdAt).toLocaleDateString()}</span>
                  <AttachmentChip name={p.attachmentName} kind={p.attachmentKind} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'post' && (
        <PostEditor
          onDone={(post) => {
            savePost(post);
            setPosts(loadPosts());
            setTab('feed');
          }}
          author={me}
        />
      )}

      {tab === 'mine' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {myPosts.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
              你还没有发布帖子。去「发布帖子」分享经验或求助吧。
            </div>
          )}
          {myPosts.map((p) => (
            <div key={p.id} className={`${panelCls} p-4`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-ink/50">{p.category}</span>
                <StatusBadge status={p.status} />
                <button
                  onClick={() => {
                    if (confirm(`删除「${p.title}」？`)) {
                      deletePost(p.id);
                      setPosts(loadPosts());
                    }
                  }}
                  className="ml-auto text-ink/40 hover:text-red-500"
                  aria-label="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <button onClick={() => setOpenPost(p)} className="block w-full text-left">
                <p className="mt-1.5 truncate text-sm font-medium text-ink">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink/50">{p.body}</p>
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'feedback' && <FeedbackArea />}

      {tab === 'channels' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNEL_GUIDES.map((c) => (
            <div key={c.name} className={`${panelCls} p-4`}>
              <p className="text-sm font-medium text-ink">{c.name}</p>
              <p className="mt-1 text-xs text-ink/50">{c.desc}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-ink/30">同步状态：{c.lastSync}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/50">
                  <ExternalLink className="h-3 w-3" /> 引导入口
                </span>
              </div>
            </div>
          ))}
          <p className="col-span-full text-[11px] text-ink/30">
            原生渠道（微信/QQ/学校 APP）由对应平台承载，Web 仅做引导与同步状态占位；真实多端发布与每日同步需后端。
          </p>
        </div>
      )}

      {openPost && (
        <PostDetail
          post={openPost}
          onClose={() => setOpenPost(null)}
          onChanged={() => {
            setPosts(loadPosts());
            setOpenPost(null);
          }}
          me={me}
        />
      )}
    </div>
  );
}

function PostEditor({
  onDone,
  author,
}: {
  onDone: (p: Omit<Post, 'id' | 'createdAt'>) => void;
  author: string;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [category, setCategory] = useState<string>(POST_CATEGORIES[0]);
  const [isHelp, setIsHelp] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [attachmentKind, setAttachmentKind] = useState<Post['attachmentKind']>();
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const kind: Post['attachmentKind'] = f.type.startsWith('image/')
      ? 'image'
      : f.type.startsWith('video/')
        ? 'video'
        : 'file';
    setAttachmentName(f.name);
    setAttachmentKind(kind);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className={`${panelCls} p-5`}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="mb-2 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="说点什么…（经验分享或你的求助）"
        className="mb-2 h-28 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-ink/15 bg-paper px-3 py-1.5 text-sm outline-none focus:border-accent"
        >
          {POST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="标签（选填）"
          className="w-28 rounded-xl border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <label className="inline-flex items-center gap-1 text-sm text-ink/60">
          <input type="checkbox" checked={isHelp} onChange={(e) => setIsHelp(e.target.checked)} />
          标记为求助帖
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink/60 hover:text-accent"
        >
          <Paperclip className="h-3.5 w-3.5" />
          附件
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={onFile} />
        {attachmentName && <AttachmentChip name={attachmentName} kind={attachmentKind} />}
        <button
          onClick={() => {
            if (!title.trim() || !body.trim()) return;
            onDone({
              title: title.trim(),
              body: body.trim(),
              tag: tag.trim() || category,
              category,
              isHelp,
              author,
              attachmentName,
              attachmentKind,
              status: 'pending',
            });
          }}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-paper"
        >
          <Send className="h-4 w-4" /> 发布
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink/30">
        新帖默认「待审核」（机器人/管理员审核后展示）；图片/视频/文件仅存元数据，二进制待后端存储。
      </p>
    </div>
  );
}

function PostDetail({
  post,
  onClose,
  onChanged,
  me,
}: {
  post: Post;
  onClose: () => void;
  onChanged: () => void;
  me: string;
}) {
  const [comments, setComments] = useState(loadComments(post.id));
  const [text, setText] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-paper p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] text-ink/50">{post.category}</span>
              <StatusBadge status={post.status} />
            </div>
            <p className="mt-1.5 text-base font-semibold text-ink">{post.title}</p>
            <p className="text-[11px] text-ink/30">
              {post.author} · {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {post.author === me && (
              <button
                onClick={() => {
                  deletePost(post.id);
                  onChanged();
                }}
                className="text-ink/40 hover:text-red-500"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="text-ink/40 hover:text-ink">
              关闭
            </button>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink/70">{post.body}</p>
        <AttachmentChip name={post.attachmentName} kind={post.attachmentKind} />

        <div className="mt-5 border-t border-ink/10 pt-3">
          <p className="mb-2 text-xs font-medium text-ink/50">评论 / 求助回复（{comments.length}）</p>
          {comments.map((c) => (
            <div key={c.id} className="mb-2 rounded-xl bg-ink/5 p-2 text-sm text-ink/70">
              <span className="text-[11px] text-ink/30">{c.author}：</span>
              {c.body}
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写评论…"
              className="flex-1 rounded-xl border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                if (!text.trim()) return;
                addComment(post.id, text.trim(), me);
                setComments(loadComments(post.id));
                setText('');
              }}
              className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-paper"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [done, setDone] = useState(false);

  return (
    <div className={`${panelCls} p-5`}>
      <p className="mb-3 text-sm font-medium text-ink">与官方直接沟通</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="反馈问题、建议或想对接的资源…"
        className="mb-2 h-28 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="联系方式（选填）"
        className="mb-3 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        onClick={() => {
          if (!content.trim()) return;
          saveFeedback(content.trim(), contact.trim() || undefined);
          setContent('');
          setContact('');
          setDone(true);
          setTimeout(() => setDone(false), 2000);
          onSubmitted?.();
        }}
        className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-paper"
      >
        <Megaphone className="h-4 w-4" /> 提交反馈
      </button>
      {done && <span className="ml-3 text-xs text-green-600">已收到，感谢反馈（演示，未接入后端）</span>}
    </div>
  );
}

function FeedbackArea() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(() => loadFeedbacks());
  return (
    <div className="space-y-4">
      <FeedbackForm onSubmitted={() => setFeedbacks(loadFeedbacks())} />
      <div className={`${panelCls} p-4`}>
        <p className="mb-1 text-sm font-medium text-ink">官方反馈公开区</p>
        <p className="mb-3 text-[11px] text-ink/40">
          你与官方的对话会公开展示在这里，所有同学都能看到官方回复。
        </p>
        {feedbacks.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink/40">
            还没有反馈。提交后会出现在这里。
          </div>
        )}
        <div className="space-y-3">
          {feedbacks.map((f) => (
            <div key={f.id} className="rounded-xl border border-ink/10 p-3">
              <p className="whitespace-pre-wrap text-sm text-ink/80">{f.content}</p>
              <p className="mt-1 text-[11px] text-ink/30">
                {f.contact ? `联系：${f.contact} · ` : ''}
                {new Date(f.createdAt).toLocaleString()}
              </p>
              {f.reply && (
                <div className="mt-2 rounded-xl bg-accent/5 p-2.5">
                  <p className="text-[11px] font-medium text-accent">官方回复</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink/80">{f.reply}</p>
                  {f.replyAt && (
                    <p className="mt-1 text-[11px] text-ink/30">{new Date(f.replyAt).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
