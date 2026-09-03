import { AdminPanel } from '@/components/admin-panel';

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">管理员后台</h1>
        <p className="mt-1 text-sm text-ink/50">
          审核队列、进度协调、用户管理与后台配置。身份由「设置」中的测试账号切换控制。
        </p>
      </header>
      <AdminPanel />
    </main>
  );
}
