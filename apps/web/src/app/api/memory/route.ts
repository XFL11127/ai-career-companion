import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { memorySearchRequestSchema, memoryWriteRequestSchema } from '@ai-career-companion/types';

// Memory persistence starts only after Supabase Auth + RLS are available. Do not proxy a browser
// request to the Worker: this route is the permanent security boundary that derives identity server-side.
const MEMORY_NOT_READY = 'memory_persistence_not_ready';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = memorySearchRequestSchema.safeParse({
    query: searchParams.get('query') ?? searchParams.get('q'),
    limit: searchParams.get('limit') ?? searchParams.get('topK') ?? undefined,
  });
  if (!input.success) {
    return NextResponse.json({ code: 400, message: 'invalid memory query' }, { status: 400 });
  }
  return NextResponse.json({
    items: [],
    mode: 'keyword',
    degraded: true,
    reason: MEMORY_NOT_READY,
  });
}

export async function POST(req: NextRequest) {
  const input = memoryWriteRequestSchema.safeParse(await req.json().catch(() => undefined));
  if (!input.success) {
    return NextResponse.json({ code: 400, message: 'invalid memory write' }, { status: 400 });
  }
  return NextResponse.json(
    { ok: false, degraded: true, reason: MEMORY_NOT_READY },
    { status: 503 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: false, degraded: true, reason: MEMORY_NOT_READY },
    { status: 503 }
  );
}
