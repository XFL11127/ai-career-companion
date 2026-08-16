/**
 * Supabase 浏览器端客户端单例。
 *
 * 被 `auth.tsx`（登录/注册/GitHub OAuth）与 `sync.ts`（云端双向同步）共用。
 * 环境变量需在 `.env.local`（本地）或 Vercel Project Settings（线上）配置：
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 未配置时采用占位地址，保证 `next build` 与模块加载不崩溃；
 * 此时登录/云端同步功能自动降级（调用会失败，但不影响本地免登流程）。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // 仅警告，不抛错：构建期与未配置环境都能正常启动。
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] 缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY，' +
      '登录与云端同步将不可用（本地免登模式不受影响）。'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key-placeholder'
);
