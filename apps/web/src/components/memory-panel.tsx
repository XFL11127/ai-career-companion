'use client';

import { useEffect, useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { loadProfile, type UserProfileData } from '@/lib/profile';
import { loadConversations, type Conversation } from '@/lib/memory';
import { searchMemory } from '@/lib/memory-api';
import { useAuth } from '@/lib/auth';

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
}

/**
 * 记忆面板：集中展示三层记忆，并把 L3 语义搜索接到 Worker 的 /memory 接口。
 * - L2 用户画像（结构化字段 + 能力诊断）
 * - L1 近期会话（本地/云端合并后的历史会话）
 * - L3 语义知识（searchMemory 走 Cloudflare Worker → Supabase pgvector）
 */
export function MemoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProfile(loadProfile());
    loadConversations()
      .then((c) => setConvs(c.slice(0, 6)))
      .catch(() => setConvs([]));
    return () => {
      setResults([]);
      setQuery('');
      setSearched(false);
    };
  }, [open]);

  const doSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    const r = await searchMemory(q, 5).catch(() => ({ results: [] }));
    setResults(r.results ?? []);
    setSearching(false);
  };

  if (!open) return null;

  const identity = [profile?.grade, profile?.major, profile?.school].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-ink/10 bg-paper shadow-xl">
        <header className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink">我的记忆</h2>
            <p className="text-xs text-ink/50">L1 会话 · L2 画像 · L3 语义知识</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {/* L2 用户画像 */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink">🧑 用户画像（L2）</h3>
            <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm text-ink/80">
              {identity ? (
                <p className="mb-2 font-medium text-ink">{identity}</p>
              ) : (
                <p className="mb-2 text-ink/40">尚未识别到你的身份信息，多在对话里介绍下自己吧</p>
              )}
              {profile?.targetRole && (
                <p className="mb-1">
                  目标岗位：<span className="text-accent">{profile.targetRole}</span>
                </p>
              )}
              {profile?.skillGaps && profile.skillGaps.length > 0 && (
                <div className="mt-2">
                  {profile.overallScore != null && (
                    <p className="mb-1">综合能力：{profile.overallScore} 分</p>
                  )}
                  <ul className="space-y-1">
                    {profile.skillGaps.map((g) => (
                      <li key={g.name} className="flex justify-between">
                        <span>{g.name}</span>
                        <span className="text-ink/60">
                          {g.current} → {g.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* L1 近期会话 */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink">💬 近期会话（L1）</h3>
            <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
              {convs.length === 0 ? (
                <p className="text-sm text-ink/40">暂无历史会话</p>
              ) : (
                <ul className="space-y-2">
                  {convs.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className="text-ink/40">{c.skill} · </span>
                      <span className="text-ink/80">{c.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* L3 语义搜索 */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink">🔎 语义记忆搜索（L3）</h3>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="搜索你的历史记忆，如「前端」"
                className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                onClick={doSearch}
                disabled={searching || !query.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-paper transition hover:bg-[#c94a23] disabled:opacity-40"
                aria-label="搜索"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-2">
              {!user && (
                <p className="text-xs text-ink/40">登录后可使用云端语义搜索；未登录时不可用</p>
              )}
              {user && searched && !searching && results.length === 0 && (
                <p className="text-xs text-ink/40">没有找到相关记忆</p>
              )}
              {results.length > 0 && (
                <ul className="space-y-2">
                  {results.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-ink/10 bg-white/70 p-3 text-sm text-ink/80"
                    >
                      {r.content}
                      <span className="ml-2 text-xs text-ink/40">
                        {Math.round(Math.max(0, r.similarity) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
