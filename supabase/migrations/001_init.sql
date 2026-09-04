-- AI学职同伴 初始 Schema v1（对齐参赛方案学生端五Skill陪伴App）
-- 启用向量扩展（记忆层 pgvector）
create extension if not exists vector;

-- 学生画像（双非学生）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  school text not null default '',
  grade text not null check (grade in ('大一','大二','大三','大四')) default '大一',
  major text not null default '',
  target_role text not null default '',
  goals text[] not null default '{}',
  streak_days int not null default 0,
  created_at timestamptz not null default now()
);

-- Skill 会话记录（诊断/规划/练兵/信息差/包装）
create table if not exists skill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null check (skill_name in ('diagnose','plan','practice','info','package')),
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- 记忆层（三层 + 向量，Mem0 + pgvector）
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  layer text not null check (layer in ('perception','interaction','knowledge')),
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists skill_sessions_user_id_idx on skill_sessions(user_id);
create index if not exists memories_user_id_idx on memories(user_id);
create index if not exists memories_embedding_idx
  on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 行级安全（Supabase Auth 后生效）
alter table profiles enable row level security;
alter table skill_sessions enable row level security;
alter table memories enable row level security;

create policy "profiles own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "skill_sessions own" on skill_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memories own" on memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
