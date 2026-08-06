import { NextRequest, NextResponse } from 'next/server'

// 透传前端记忆读写到 Worker（服务端 L1 长期记忆）。
// Worker 未部署（NEXT_PUBLIC_WORKER_URL 未配）时优雅降级：GET 返回空、POST/DELETE 返回 ok:false，
// 不阻断主链路；上线 Worker 后自动生效。
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (!WORKER_URL) return NextResponse.json({ items: [], count: 0, degraded: true })
  try {
    const res = await fetch(`${WORKER_URL}/memory?${searchParams.toString()}`, {
      headers: { 'content-type': 'application/json' },
    })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ items: [], count: 0, degraded: true })
  }
}

export async function POST(req: NextRequest) {
  if (!WORKER_URL) return NextResponse.json({ ok: false, degraded: true })
  try {
    const body = await req.json()
    const res = await fetch(`${WORKER_URL}/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ ok: false, degraded: true })
  }
}

export async function DELETE(req: NextRequest) {
  if (!WORKER_URL) return NextResponse.json({ ok: false, degraded: true })
  try {
    const { searchParams } = new URL(req.url)
    const res = await fetch(`${WORKER_URL}/memory?${searchParams.toString()}`, { method: 'DELETE' })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ ok: false, degraded: true })
  }
}
