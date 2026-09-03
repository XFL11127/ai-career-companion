/**
 * 产品内角色 / 身份层（见 项目说明.md「身份 / 角色制度」一节）
 *
 * 与开发团队角色（A/B/C/D）无关，是产品内权限。
 * 账号体系最终由 Supabase Auth 承载；本期未建，先用「测试账号 + localStorage 角色」模拟，
 * 以便前端门禁（系统资源库受保护）可演示。Supabase Auth 就绪后：loadRole/setRole 改为读会话。
 */

export type AppRole = 'student' | 'teacher' | 'admin';

export interface TestAccount {
  id: string;
  name: string;
  role: AppRole;
  desc: string;
}

/** 演示用测试账号（切换即模拟不同身份）。 */
export const TEST_ACCOUNTS: TestAccount[] = [
  { id: 'u_student', name: '陈同学（学生）', role: 'student', desc: '双非在校生 · 可浏览/自建/提交贡献' },
  { id: 'u_teacher', name: '李老师（高校老师）', role: 'teacher', desc: '可编辑受保护系统库、审核贡献' },
  { id: 'u_admin', name: '维护员（系统维护员）', role: 'admin', desc: '平台运维、Key 配置、审核队列' },
];

const ROLE_KEY = 'app_role';
const ROLE_USER_KEY = 'app_role_user';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadRole(): AppRole {
  if (!isBrowser()) return 'student';
  const r = localStorage.getItem(ROLE_KEY) as AppRole | null;
  return r === 'teacher' || r === 'admin' ? r : 'student';
}

export function loadRoleUser(): TestAccount {
  const role = loadRole();
  return TEST_ACCOUNTS.find((a) => a.role === role) ?? TEST_ACCOUNTS[0];
}

export function setRole(role: AppRole): void {
  if (!isBrowser()) return;
  localStorage.setItem(ROLE_KEY, role);
  const acc = TEST_ACCOUNTS.find((a) => a.role === role);
  if (acc) localStorage.setItem(ROLE_USER_KEY, acc.id);
}

export function canEditSystemLib(role: AppRole = loadRole()): boolean {
  return role === 'teacher' || role === 'admin';
}

export function canReview(role: AppRole = loadRole()): boolean {
  return role === 'teacher' || role === 'admin';
}

export function canConfigBackend(role: AppRole = loadRole()): boolean {
  return role === 'admin';
}

export const ROLE_LABEL: Record<AppRole, string> = {
  student: '学生',
  teacher: '高校老师',
  admin: '系统维护员',
};
