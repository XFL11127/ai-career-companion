import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

export type AuthUser = {
  id: string
  email: string
  name: string
  passwordHash: string
}

// ⚠️ 过渡态：内存用户表。进程重启 / Serverless 冷启动会清空。
// 生产持久化需接入 Supabase（P4 阶段）。当前用于本地与演示「能真跑」。
const users = new Map<string, AuthUser>()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, 64)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function findUser(email: string): AuthUser | undefined {
  return users.get(email.toLowerCase())
}

export function createUser(email: string, password: string, name?: string): AuthUser | null {
  const key = email.toLowerCase()
  if (users.has(key)) return null
  const user: AuthUser = {
    id: randomBytes(8).toString('hex'),
    email: key,
    name: name?.trim() || key.split('@')[0],
    passwordHash: hashPassword(password),
  }
  users.set(key, user)
  return user
}

// 预置演示账号：评委可直接登录体验（demo@aicc.com / demo1234）
createUser('demo@aicc.com', 'demo1234', '演示同学')
