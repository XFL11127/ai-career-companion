import { handlers } from '@/auth';

// 使用 Node.js runtime：Credentials Provider 依赖 node:crypto（scrypt）
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
