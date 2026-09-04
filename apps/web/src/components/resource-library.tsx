'use client';

import { useMemo } from 'react';
import { panelCls } from '@/components/skill-ui';
import { Plus, Library } from 'lucide-react';
import { loadResources, loadContributions } from '@/lib/infobase';
import { SourceCard } from '@/components/source-card';

/**
 * 资源库（UC-B4）：统一列表（系统库 + 已发布用户贡献），系统受保护条目带「受保护」徽章。
 * 空态 + 贡献入口。详见 项目说明.md「信息库数据模型 / 本期 MVP 范围」。
 */
export function ResourceLibrary({ onGoContribute }: { onGoContribute: () => void }) {
  const items = useMemo(() => {
    const sys = loadResources();
    const published = loadContributions().filter((c) => c.status === 'published');
    // 去重：旧 localStorage 数据可能存在 resources 与 contributions 同一 id（Req E 修复前的产物）
    const seen = new Set<string>();
    return [...sys, ...published]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, []);

  return (
    <section className={`${panelCls} p-5`}>
      <header className="mb-4 flex items-center gap-2">
        <Library className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold tracking-tight text-ink">资源库</h2>
        <span className="ml-auto text-xs text-ink/40">{items.length} 条</span>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 p-8 text-center text-sm text-ink/40">
          资源库还是空的。去「贡献」提交你发现的双非友好岗位、学校官网或学习资源吧。
          <div className="mt-3">
            <button
              type="button"
              onClick={onGoContribute}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-paper"
            >
              <Plus className="h-3.5 w-3.5" />
              去贡献
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <SourceCard
              key={it.id}
              title={it.title}
              url={it.url}
              summary={it.summary}
              sourceSite={it.sourceSite}
              datePublished={new Date(it.createdAt).toISOString().slice(0, 10)}
              protectedItem={it.protected}
            />
          ))}
        </div>
      )}
    </section>
  );
}
