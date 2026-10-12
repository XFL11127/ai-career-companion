import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { findUser, verifyPassword } from '@/lib/auth-users';
import type { AppRole } from '@/lib/role';

/**
 * 引导用：GitHub 登录没有本地用户记录，此时用环境变量白名单授予审核角色。
 * 格式：HUB_REVIEWER_EMAILS=a@x.com,b@y.com
 * 正式方案应把角色存进数据库（Supabase），届时删除这个函数。
 */
function reviewerRoleFromEnv(email?: string | null): AppRole {
  if (!email) return 'student';
  const list = (process.env.HUB_REVIEWER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase()) ? 'admin' : 'student';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel / 任意托管平台均把 Host 交给框架判断，避免部署时 trustHost 报错
  trustHost: true,
  // ⚠️ AUTH_SECRET 在 production（Vercel / next start）为必填，缺失会抛
  //    AuthError: "There was a problem with the server configuration."
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    // 仅当配置了 GITHUB_ID / GITHUB_SECRET 才注册 GitHub Provider，
    // 否则不注册（避免空 clientId 引发配置异常）。邮箱密码始终可用。
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: '邮箱密码',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? '').toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;
        const user = findUser(email);
        if (!user) return null;
        const ok = verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role =
          (user as { role?: AppRole }).role ?? reviewerRoleFromEnv(user.email ?? undefined);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: AppRole }).role =
          (token.role as AppRole | undefined) ?? 'student';
      }
      return session;
    },
  },
});
