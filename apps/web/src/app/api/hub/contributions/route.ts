import { NextResponse } from 'next/server';
import { createContribution, listContributions, reviewContribution } from '@/lib/hub-store';
import { getSessionRole } from '@/lib/session-role';

/**
 * 信息中枢 · 贡献与审核（BFF）
 *
 * 权限模型（2026-09-25 起）：
 * - 身份只来自 NextAuth 会话（getSessionRole），**不再接受 x-hub-role 之类由客户端声明的角色**；
 * - 提交贡献：登录用户自动绑定会话身份；未登录仍可提交，但归属记为匿名并退回本机保存；
 * - 审核（PATCH）：必须登录且会话角色为 teacher / admin，否则 401 / 403。
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') ?? 'mine';
  const session = await getSessionRole();

  if (!session.signedIn) {
    return NextResponse.json(
      { items: [], source: 'seed', degraded: true, error: '未登录，贡献保存在本机浏览器' },
      { status: 401 }
    );
  }

  // 只有审核者可以看全量；普通用户只能看自己的
  const ownerId = scope === 'all' && session.isReviewer ? undefined : session.userId;
  const result = await listContributions(ownerId);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  if (!title) return NextResponse.json({ ok: false, error: '标题不能为空' }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: '来源链接必须是 http(s) 地址' }, { status: 400 });
  }

  // 归属只信会话：已登录用会话身份，未登录记为匿名（客户端自报的 ownerId 不予采信）
  const session = await getSessionRole();

  const result = await createContribution({
    kind: (body.kind as never) ?? 'resource',
    title,
    summary: String(body.summary ?? ''),
    url,
    company: body.company ? String(body.company) : undefined,
    role: body.role ? String(body.role) : undefined,
    signal: (body.signal as never) ?? undefined,
    quote: body.quote ? String(body.quote) : undefined,
    contact: body.contact ? String(body.contact) : undefined,
    ownerId: session.signedIn ? session.userId : 'anon',
    ownerRole: session.signedIn ? session.role : 'anon',
  });

  const status = result.ok ? 201 : result.degraded ? 503 : 400;
  return NextResponse.json(result, { status });
}

export async function PATCH(request: Request) {
  const session = await getSessionRole();
  if (!session.signedIn) {
    return NextResponse.json(
      { ok: false, error: '请先登录后再审核（教师 / 管理员账号）' },
      { status: 401 }
    );
  }
  if (!session.isReviewer) {
    return NextResponse.json(
      { ok: false, error: `当前账号角色为 ${session.role}，没有审核权限` },
      { status: 403 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const id = String(body.id ?? '');
  const to = String(body.status ?? '');
  if (!id || !to) {
    return NextResponse.json({ ok: false, error: '缺少 id 或 status' }, { status: 400 });
  }

  const result = await reviewContribution({
    id,
    to: to as never,
    credibility: (body.credibility as never) ?? undefined,
    // 审核人记会话姓名，不采用客户端自报值
    reviewer: session.name ?? session.email ?? session.role,
    reviewNote: body.reviewNote ? String(body.reviewNote) : undefined,
    ownerId: body.ownerId ? String(body.ownerId) : undefined,
  });

  const status = result.ok ? 200 : result.degraded ? 503 : 400;
  return NextResponse.json(result, { status });
}
