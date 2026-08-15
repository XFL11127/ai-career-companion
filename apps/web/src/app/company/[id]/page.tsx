'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MapPin, Clock } from 'lucide-react';

interface JobDetail {
  company: string;
  role: string;
  salary: string;
  location: string;
  tags: string[];
  url: string;
  description: string;
  requirements: string[];
  deadline: string;
}

export default function CompanyPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/job/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('请求失败');
        return res.json();
      })
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => {
        setError('该岗位信息暂时无法加载，请稍后重试');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="mt-3 text-sm text-ink/60">正在加载岗位详情…</p>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/info"
          className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> 返回信息差
        </Link>
        <div className="rounded-2xl border border-ink/10 bg-amber-50 p-8 text-center">
          <p className="text-ink/70">{error || '该岗位信息不存在'}</p>
          <Link
            href="/info"
            className="mt-4 inline-block rounded-full bg-accent px-5 py-2 text-sm text-paper"
          >
            查看其他机会
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/info"
        className="mb-4 inline-flex items-center gap-1 text-sm text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> 返回信息差
      </Link>

      {/* 岗位头部 */}
      <div className="rounded-3xl border border-ink/10 bg-white/70 p-6">
        <h1 className="font-serif text-2xl font-bold text-ink">{job.role}</h1>
        <p className="mt-1 text-lg text-ink/70">{job.company}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink/60">
          <span className="rounded-full bg-forest/10 px-3 py-1 text-forest">{job.salary}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {job.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> 截止 {job.deadline}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {job.tags.map((t, i) => (
            <span key={i} className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 岗位描述 */}
      <div className="mt-6 rounded-3xl border border-ink/10 bg-white/70 p-6">
        <h2 className="font-serif text-lg font-bold text-ink">岗位描述</h2>
        <p className="mt-3 leading-relaxed text-ink/80">{job.description}</p>
      </div>

      {/* 任职要求 */}
      <div className="mt-6 rounded-3xl border border-ink/10 bg-white/70 p-6">
        <h2 className="font-serif text-lg font-bold text-ink">任职要求</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink/80">
          {job.requirements.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* 投递链接 */}
      <div className="mt-6 text-center">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-amber-600"
        >
          前往投递 <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </main>
  );
}
