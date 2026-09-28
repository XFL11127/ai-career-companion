import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import type { AppRole } from '@/lib/role';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  passwordHash: string;
};

// ⚠️ 过渡态：内存用户表。进程重启 / Serverless 冷启动会清空。
// 生产持久化需接入 Supabase（P4 阶段）。当前用于本地与演示「能真跑」。
// 注意：下面的演示账号在模块加载时重新播种，因此冷启动后依然可用。
const users = new Map<string, AuthUser>();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function findUser(email: string): AuthUser | undefined {
  return users.get(email.toLowerCase());
}

export function createUser(
  email: string,
  password: string,
  name?: string,
  role: AppRole = 'student'
): AuthUser | null {
  const key = email.toLowerCase();
  if (users.has(key)) return null;
  const user: AuthUser = {
    id: randomBytes(8).toString('hex'),
    email: key,
    name: name?.trim() || key.split('@')[0],
    role,
    passwordHash: hashPassword(password),
  };
  users.set(key, user);
  return user;
}

/**
 * 演示账号（评委可直接登录体验）：
 * - demo@aicc.com    / demo1234     → 学生
 * - teacher@aicc.com / teacher1234  → 高校老师（可审核贡献）
 * - admin@aicc.com   / admin1234    → 系统维护员（可审核贡献）
 */
createUser('demo@aicc.com', 'demo1234', '演示同学', 'student');
createUser('teacher@aicc.com', 'teacher1234', '李老师', 'teacher');
createUser('admin@aicc.com', 'admin1234', '维护员', 'admin');

/** 演示账号清单（只暴露邮箱与角色，不暴露口令哈希） */
export const DEMO_ACCOUNTS: { email: string; password: string; role: AppRole; name: string }[] = [
  { email: 'demo@aicc.com', password: 'demo1234', role: 'student', name: '演示同学' },
  { email: 'teacher@aicc.com', password: 'teacher1234', role: 'teacher', name: '李老师' },
  { email: 'admin@aicc.com', password: 'admin1234', role: 'admin', name: '维护员' },
];
