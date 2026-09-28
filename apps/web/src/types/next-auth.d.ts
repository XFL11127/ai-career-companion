import type { DefaultSession } from 'next-auth';
import type { AppRole } from '@/lib/role';

/**
 * NextAuth 类型增强：把「产品内角色」带进会话。
 * 角色来源见 apps/web/src/auth.ts 的 callbacks：
 *   1) 邮箱密码登录 → 用户记录里的 role；
 *   2) GitHub 登录 → HUB_REVIEWER_EMAILS 白名单（引导用），否则 student。
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: AppRole;
    } & DefaultSession['user'];
  }

  interface User {
    role?: AppRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: AppRole;
  }
}
