/**
 * 服务端会话 → 产品内角色。
 *
 * 这是审核类接口的唯一权限来源：**不再接受任何请求头声明的角色**。
 * 未登录一律视为无审核权限；登录但角色不是 teacher/admin 也不授予权限。
 */

import { auth } from '@/auth';
import type { AppRole } from '@/lib/role';

export interface SessionRole {
  signedIn: boolean;
  email?: string;
  name?: string;
  userId?: string;
  role: AppRole;
  isReviewer: boolean;
}

export async function getSessionRole(): Promise<SessionRole> {
  const session = await auth();
  const user = session?.user as
    { id?: string; email?: string | null; name?: string | null; role?: AppRole } | undefined;

  const role: AppRole = user?.role ?? 'student';
  return {
    signedIn: Boolean(user),
    email: user?.email ?? undefined,
    name: user?.name ?? undefined,
    userId: user?.id,
    role,
    isReviewer: Boolean(user) && (role === 'teacher' || role === 'admin'),
  };
}
