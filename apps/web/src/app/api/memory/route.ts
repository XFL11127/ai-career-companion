import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// 记忆读写透传层。当前服务端持久化（Cloudflare Worker）已弃用，未配置 NEXT_PUBLIC_WORKER_URL 时
// 优雅降级：GET 返回空、POST/DELETE 返回 ok:false，不阻断主链路；前端 L1 记忆走 localStorage。
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (!WORKER_URL) return NextResponse.json({ items: [], count: 0, degraded: true });
  try {
    const res = await fetch(`${WORKER_URL}/memory?${searchParams.toString()}`, {
      headers: { 'content-type': 'application/json' },
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ items: [], count: 0, degraded: true });
  }
}

export async function POST(req: NextRequest) {
  if (!WORKER_URL) return NextResponse.json({ ok: false, degraded: true });
  try {
    const body = await req.json();
    const res = await fetch(`${WORKER_URL}/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ok: false, degraded: true });
  }
}

export async function DELETE(req: NextRequest) {
  if (!WORKER_URL) return NextResponse.json({ ok: false, degraded: true });
  try {
    const { searchParams } = new URL(req.url);
    const res = await fetch(`${WORKER_URL}/memory?${searchParams.toString()}`, {
      method: 'DELETE',
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ok: false, degraded: true });
  }
}
