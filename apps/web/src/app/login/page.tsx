'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  const [githubEnabled, setGithubEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    getProviders()
      .then((p) => {
        if (active) setGithubEnabled(!!p?.github);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleGitHub = () => {
    setMsg(null);
    signIn('github', { callbackUrl: '/' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg({ type: 'error', text: data.error || '注册失败' });
          setLoading(false);
          return;
        }
      }
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setMsg({ type: 'error', text: '邮箱或密码不正确' });
        setLoading(false);
        return;
      }
      setMsg({ type: 'ok', text: '登录成功，正在跳转…' });
      router.push('/');
      router.refresh();
    } catch {
      setMsg({ type: 'error', text: '网络异常，请重试' });
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-ink/10 bg-paper/80 p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-center font-serif text-2xl font-bold text-ink">
          {mode === 'login' ? '登录账号' : '注册账号'}
        </h1>
        <p className="mt-2 text-center text-sm text-ink/60">登录后可跨设备同步你的学职会话与画像</p>

        {/* GitHub 第三方登录（仅当后端已配置 GitHub Provider 时显示） */}
        {githubEnabled && (
          <button
            onClick={handleGitHub}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-ink/15 bg-paper px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            <GitHubMark className="h-4 w-4" />
            使用 GitHub 登录
          </button>
        )}

        {githubEnabled && (
          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            或使用邮箱
            <span className="h-px flex-1 bg-ink/10" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="昵称（可选）"
              className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />

          {msg && (
            <p
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
                msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-forest/10 text-forest'
              }`}
            >
              {msg.type === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-paper shadow-lg shadow-accent/20 transition hover:bg-[#c94a23] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setMsg(null);
          }}
          className="mt-4 w-full text-center text-xs text-ink/50 transition hover:text-ink"
        >
          {mode === 'login' ? '还没有账号？去注册' : '已有账号？去登录'}
        </button>

        <Link
          href="/"
          className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink/40 transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回对话（免登录也可用）
        </Link>
      </div>

      <p className="mt-6 text-xs text-ink/40">AI学职同伴 · 面向双非学生的学职陪伴 Copilot</p>
    </main>
  );
}
