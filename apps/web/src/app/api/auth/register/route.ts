import { NextResponse } from 'next/server';
import { createUser } from '@/lib/auth-users';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim();
  const password = String(body?.password ?? '');
  const name = body?.name ? String(body.name) : undefined;

  if (!email || !password) {
    return NextResponse.json({ error: '邮箱和密码必填' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
  }

  const user = createUser(email, password, name);
  if (!user) {
    return NextResponse.json({ error: '该邮箱已注册' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, email: user.email });
}
