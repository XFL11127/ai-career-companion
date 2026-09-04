'use client';

import { useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import {
  TEST_ACCOUNTS,
  loadRole,
  loadRoleUser,
  setRole,
  ROLE_LABEL,
  canEditSystemLib,
  canReview,
  canConfigBackend,
  type AppRole,
} from '@/lib/role';

/**
 * 测试账号 / 角色切换器（本期前端占位，见 项目说明.md 身份制度）。
 * Supabase Auth 就绪后：改为读取会话账号角色，移除本组件。
 */
export function RoleSwitcher() {
  const [role, setRoleState] = useState<AppRole>(loadRole());
  const user = loadRoleUser();

  function pick(r: AppRole) {
    setRole(r);
    setRoleState(r);
  }

  const perms = [
    { label: '编辑受保护系统资源库', ok: canEditSystemLib(role) },
    { label: '审核用户贡献', ok: canReview(role) },
    { label: '配置检索 Key / 后台', ok: canConfigBackend(role) },
  ];

  return (
    <section className="mb-6 rounded-lg border border-ink/10 bg-paper p-4">
      <h2 className="flex items-center gap-2 font-medium text-sm text-ink mb-1">
        <ShieldCheck className="h-4 w-4 text-accent" />
        身份 / 角色（测试账号）
      </h2>
      <p className="mb-3 text-xs text-ink/45">
        当前为 MVP：用测试账号模拟不同身份，验证系统资源库受保护与审核门禁。正式账号体系待 Supabase
        Auth 接入。
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {TEST_ACCOUNTS.map((a) => {
          const active = role === a.role;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.role)}
              className={`rounded-md border px-3 py-2 text-left transition ${
                active ? 'border-accent bg-accent/[0.06]' : 'border-ink/10 hover:border-accent/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{a.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-accent" />}
              </div>
              <p className="mt-0.5 text-[11px] text-ink/45">{a.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-md bg-ink/[0.03] px-3 py-2">
        <div className="text-xs text-ink/60">
          当前身份：<strong className="text-ink">{ROLE_LABEL[role]}</strong>（{user.name}）
        </div>
        <ul className="mt-1.5 space-y-1">
          {perms.map((p) => (
            <li key={p.label} className="flex items-center gap-1.5 text-xs">
              <span className={p.ok ? 'text-forest' : 'text-ink/30'}>{p.ok ? '✓' : '✕'}</span>
              <span className={p.ok ? 'text-ink/70' : 'text-ink/35'}>{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
