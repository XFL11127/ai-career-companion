import { CommunityModule } from '@/components/community';

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">学职频道</h1>
        <p className="mt-1 text-sm text-ink/50">
          双非互助社区：分享经验、求助答疑、与官方直接沟通；并引导至微信/QQ/学校 APP 等原生渠道。
        </p>
      </header>
      <CommunityModule />
    </main>
  );
}
