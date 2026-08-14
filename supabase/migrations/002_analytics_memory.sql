-- AI学职同伴 补给 Schema v2（看板 + 记忆，免登模型，不依赖 pgvector / Supabase Auth）
-- 与 001_init.sql 的关系：001 的 memories/skill_sessions 绑了 auth.users 外键且 embedding 为
-- OpenAI 1536 维；本项目免登、用 Cloudflare bge-m3(1024 维)，故这里用独立新表，避免外键/维度冲突。
-- 注意：本文件表未开 RLS，演示可用；上线前若启用登录需补 RLS 策略。

-- 记忆层（worker 实际写入的表，对应 /memory 路由）
-- embedding 用 float8[] 存 bge-m3 的 1024 维向量，召回在 worker 端做余弦（不依赖 pgvector 扩展）。
create table if not exists memory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anon',
  content text not null,
  layer text not null default 'interaction',
  embedding float8[],
  created_at timestamptz not null default now()
);
create index if not exists memory_user_id_idx on memory(user_id);
create index if not exists memory_created_at_idx on memory(created_at desc);

-- Skill 调用事件（看板：使用分布 / 活跃天数趋势 / 最新诊断雷达）
create table if not exists skill_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anon',
  skill_name text not null check (skill_name in ('diagnose','plan','practice','info','package')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists skill_events_user_id_idx on skill_events(user_id);
create index if not exists skill_events_skill_idx on skill_events(skill_name);
create index if not exists skill_events_created_at_idx on skill_events(created_at desc);

-- 用户画像（看板：画像完成度）
create table if not exists user_profiles (
  user_id text primary key default 'anon',
  profile jsonb not null default '{}',
  completeness int not null default 0,
  updated_at timestamptz not null default now()
);
