-- 007: 信息中枢证据链（Evidence Hub）
-- 目标：把「双非友好」从口头标签变成可核对的证据，并在数据库层强制这条规则。
-- 依赖：无（自包含）。访问方式：浏览器一律走 Next.js BFF，BFF 用 service_role 访问；
--       浏览器不直接写这三张表。

-- ---------- 1. 证据条目 ----------
create table if not exists evidence_items (
  id text primary key,
  company text not null,
  role text not null,
  signal text not null check (signal in (
    'degree_barrier','school_list','bonus','historical_admit','policy','deadline'
  )),
  direction text not null default 'positive' check (direction in ('positive','negative')),
  quote text not null,
  source_url text not null,
  source_site text not null default '',
  published_at text,
  fetched_at timestamptz not null default now(),
  credibility text not null check (credibility in ('A','B','C')),
  reviewer text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  -- 证据门禁（数据库层）：原文摘录足够长、且来源必须是 http(s) 链接，否则不允许落库为 approved
  constraint evidence_items_quote_len check (char_length(btrim(quote)) >= 8),
  constraint evidence_items_source_is_url check (source_url ~* '^https?://')
);

create index if not exists evidence_items_status_idx on evidence_items(status);
create index if not exists evidence_items_signal_idx on evidence_items(signal);
create index if not exists evidence_items_company_idx on evidence_items(company);
create index if not exists evidence_items_source_site_idx on evidence_items(source_site);

-- ---------- 2. 岗位（只收带证据或明确标注无依据的岗位，不再有匿名占位）----------
create table if not exists hub_jobs (
  id text primary key,
  company text not null,
  role text not null,
  salary text not null default '面议',
  location text not null default '',
  industry text not null default '',
  degree text not null default '',
  tags jsonb not null default '[]'::jsonb,
  url text not null,
  description text not null default '',
  requirements jsonb not null default '[]'::jsonb,
  deadline text not null default '',
  -- 是否已人工确认该岗位信息本身真实存在（与「双非友好」标签无关）
  listing_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint hub_jobs_url_is_url check (url ~* '^https?://')
);

create index if not exists hub_jobs_location_idx on hub_jobs(location);
create index if not exists hub_jobs_industry_idx on hub_jobs(industry);

-- ---------- 3. 用户贡献（UGC）+ 审核状态机 ----------
create table if not exists hub_contributions (
  id text primary key,
  kind text not null check (kind in ('job','internship','policy','school','resource','interview_exp')),
  title text not null,
  summary text not null default '',
  url text not null,
  company text,
  role text,
  signal text check (signal in (
    'degree_barrier','school_list','bonus','historical_admit','policy','deadline'
  )),
  quote text,
  contact text,
  status text not null default 'pending' check (status in ('pending','needs_info','approved','rejected')),
  credibility text check (credibility in ('A','B','C')),
  reviewer text,
  review_note text,
  points integer not null default 0,
  owner_id text,
  owner_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hub_contributions_url_is_url check (url ~* '^https?://'),
  -- 关键约束：任何被置为 approved 的贡献，必须有 ≥8 字原文摘录，否则数据库直接拒绝
  constraint hub_contributions_approved_needs_quote check (
    status <> 'approved' or (quote is not null and char_length(btrim(quote)) >= 8)
  )
);

create index if not exists hub_contributions_status_idx on hub_contributions(status);
create index if not exists hub_contributions_owner_idx on hub_contributions(owner_id);
create index if not exists hub_contributions_created_idx on hub_contributions(created_at desc);

-- 审核状态机（数据库层）：只允许约定内的流转
create or replace function hub_contribution_guard_transition() returns trigger as $$
begin
  if new.status <> old.status then
    if not (
      (old.status = 'pending'    and new.status in ('approved','rejected','needs_info')) or
      (old.status = 'needs_info' and new.status in ('pending','rejected')) or
      (old.status = 'rejected'   and new.status = 'pending')
    ) then
      raise exception '非法状态流转：% -> %', old.status, new.status;
    end if;
  end if;

  if new.status = 'approved' and (new.quote is null or char_length(btrim(new.quote)) < 8) then
    raise exception '通过审核的贡献必须带原文摘录（≥8 字）';
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hub_contributions_guard on hub_contributions;
create trigger hub_contributions_guard
  before update on hub_contributions
  for each row execute function hub_contribution_guard_transition();

-- ---------- 4. 贡献积分流水 ----------
create table if not exists hub_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  contribution_id text references hub_contributions(id) on delete cascade,
  points integer not null,
  credibility text check (credibility in ('A','B','C')),
  reason text not null default '贡献审核通过',
  created_at timestamptz not null default now()
);

create index if not exists hub_points_ledger_user_idx on hub_points_ledger(user_id);

-- ---------- 5. 白名单域名（可运营配置，不用改代码）----------
create table if not exists hub_whitelist_domains (
  domain text primary key,
  name text not null default '',
  tier text not null default 'official' check (tier in ('official','authoritative')),
  category text not null default 'other' check (category in ('gov','company','university','platform','other')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- 6. 权限：浏览器不直连，BFF 用 service_role ----------
alter table evidence_items enable row level security;
alter table hub_jobs enable row level security;
alter table hub_contributions enable row level security;
alter table hub_points_ledger enable row level security;
alter table hub_whitelist_domains enable row level security;

revoke all on table evidence_items from anon;
revoke all on table hub_jobs from anon;
revoke all on table hub_contributions from anon;
revoke all on table hub_points_ledger from anon;
revoke all on table hub_whitelist_domains from anon;

grant usage on schema public to service_role;
grant select, insert, update, delete on table evidence_items to service_role;
grant select, insert, update, delete on table hub_jobs to service_role;
grant select, insert, update, delete on table hub_contributions to service_role;
grant select, insert, update, delete on table hub_points_ledger to service_role;
grant select, insert, update, delete on table hub_whitelist_domains to service_role;

-- 已登录用户可读「已通过」的证据与岗位（RLS 兜底，主路径仍走 BFF）
grant select on table evidence_items to authenticated;
grant select on table hub_jobs to authenticated;

drop policy if exists "evidence_items_read_approved" on evidence_items;
create policy "evidence_items_read_approved"
  on evidence_items for select to authenticated
  using (status = 'approved');

drop policy if exists "hub_jobs_read_all" on hub_jobs;
create policy "hub_jobs_read_all"
  on hub_jobs for select to authenticated
  using (true);