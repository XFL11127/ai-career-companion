-- 005: 分析聚合 KPI（运营端看板 /analytics）
-- 提供跨用户的聚合统计（不含 PII），供 /analytics 页通过 supabase.rpc 调用。
-- security definer：以 owner(postgres) 身份运行，绕过 RLS 聚合全量数据。

create or replace function get_analytics_kpis()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'total_users', (select count(*)::int from profiles),
    'total_sessions', (select count(*)::int from skill_sessions),
    'active_users_7d', (select count(distinct user_id)::int from skill_sessions where created_at > now() - interval '7 days'),
    'active_users_30d', (select count(distinct user_id)::int from skill_sessions where created_at > now() - interval '30 days'),
    'skill_counts', (
      select coalesce(json_agg(json_build_object('skill_name', skill_name, 'count', c) order by c desc), '[]'::json)
      from (select skill_name, count(*)::int as c from skill_sessions group by skill_name) s
    ),
    'daily_sessions_28d', (
      select coalesce(json_agg(json_build_object('day', d, 'count', c) order by d), '[]'::json)
      from (
        select created_at::date as d, count(*)::int as c
        from skill_sessions
        where created_at > now() - interval '28 days'
        group by created_at::date
      ) x
    )
  );
$$;

-- 运营端看板需登录访问：仅授予 authenticated（匿名 anon 不可调用）
revoke execute on function get_analytics_kpis() from public;
grant execute on function get_analytics_kpis() to authenticated, service_role;
