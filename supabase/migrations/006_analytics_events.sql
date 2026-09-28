-- 006: Analytics event tracking and diagnosis results
-- Implements Issue #23: real dashboard data for /analytics.
-- The browser never writes directly to these tables; Next.js /api/track uses service_role.
-- Authenticated Supabase users can only read/write their own rows if they access REST directly.

create table if not exists user_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anon',
  anonymous_id text,
  session_id text,
  event_name text not null,
  skill_name text,
  page_path text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_events_user_id_idx on user_events(user_id);
create index if not exists user_events_event_name_idx on user_events(event_name);
create index if not exists user_events_skill_name_idx on user_events(skill_name);
create index if not exists user_events_created_at_idx on user_events(created_at desc);

create table if not exists diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anon',
  anonymous_id text,
  session_id text,
  target_role text,
  radar jsonb not null default '[]'::jsonb,
  recommended_roles jsonb not null default '[]'::jsonb,
  overall_score int,
  created_at timestamptz not null default now()
);

create index if not exists diagnosis_results_user_id_idx on diagnosis_results(user_id);
create index if not exists diagnosis_results_created_at_idx on diagnosis_results(created_at desc);

-- Some environments skipped 002_analytics_memory.sql. Make this migration self-contained.
create table if not exists skill_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'anon',
  skill_name text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists skill_events_user_id_idx on skill_events(user_id);
create index if not exists skill_events_skill_idx on skill_events(skill_name);
create index if not exists skill_events_created_at_idx on skill_events(created_at desc);

-- Existing skill_events check constraint only allowed the original five skills.
alter table skill_events drop constraint if exists skill_events_skill_name_check;
alter table skill_events
  add constraint skill_events_skill_name_check
  check (skill_name in (
    'diagnose','plan','practice','info','package',
    'resume','interview','match','course','assessment'
  ));

alter table user_events enable row level security;
alter table diagnosis_results enable row level security;

-- No anonymous direct access. Server-side /api/track uses service_role and bypasses RLS.
revoke all on table user_events from anon;
revoke all on table diagnosis_results from anon;
grant select, insert on table user_events to authenticated;
grant select, insert on table diagnosis_results to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table user_events to service_role;
grant select, insert, update, delete on table diagnosis_results to service_role;
grant select, insert, update, delete on table skill_events to service_role;

drop policy if exists "user_events_select_own" on user_events;
create policy "user_events_select_own"
  on user_events for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "user_events_insert_own" on user_events;
create policy "user_events_insert_own"
  on user_events for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists "diagnosis_results_select_own" on diagnosis_results;
create policy "diagnosis_results_select_own"
  on diagnosis_results for select to authenticated
  using (auth.uid()::text = user_id);

drop policy if exists "diagnosis_results_insert_own" on diagnosis_results;
create policy "diagnosis_results_insert_own"
  on diagnosis_results for insert to authenticated
  with check (auth.uid()::text = user_id);
