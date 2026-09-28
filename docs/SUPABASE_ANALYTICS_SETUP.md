# Supabase 数据看板接入指南

> 对应 GitHub Issue #23：`【数据看板】接入真实数据`
> 代码实现日期：2026-09-25

## 一、已实现

- `apps/web/src/lib/track.ts`：浏览器埋点统一入口。
- `apps/web/src/app/api/track/route.ts`：服务端埋点接口，使用 `service_role` 写入 Supabase。
- `apps/web/src/app/api/analytics/route.ts`：真实聚合接口，返回总用户、事件、7 日活跃、今日事件、诊断次数、趋势、Skill 分布和画像完成度。
- `apps/web/src/app/analytics/page.tsx`：已移除硬编码示例，接入真实 API 和空数据状态。
- 页面访问、Skill 成功/失败、诊断结果、画像更新、登录均会触发埋点。
- `supabase/migrations/006_analytics_events.sql`：创建 `user_events`、`diagnosis_results`，补充 RLS 策略并扩展现有 `skill_events` 的 Skill 名称约束。

## 二、数据库迁移

在 Supabase Dashboard → SQL Editor 执行：

```text
supabase/migrations/006_analytics_events.sql
```

迁移完成后应存在：

- `user_events`
- `diagnosis_results`
- `skill_events` 的 Skill 名称约束包含 10 个 Skill

若暂未执行迁移，代码会兼容读取现有：

- `skill_events`
- `memory`
- `user_profiles`

## 三、环境变量

本地 `apps/web/.env.local` 需要：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`service_role` 只能存在于服务端环境变量中，不能加 `NEXT_PUBLIC_` 前缀。

## 四、验证

1. 重启开发服务器，确保新环境变量加载：

```powershell
npm run web
```

2. 打开任意页面制造页面访问事件：

```text
http://localhost:3000/analytics
```

3. 检查 API：

```powershell
Invoke-WebRequest http://localhost:3000/api/analytics -UseBasicParsing
```

期望：

```json
{
  "demo": false,
  "configured": true,
  "source": "supabase",
  "kpis": {
    "totalEvents": 1
  }
}
```

4. 打开看板确认：

```text
http://localhost:3000/analytics
```

页面右上角应显示：

```text
Supabase 实时数据
```

空库时显示：

```text
Supabase 已连接 · 暂无事件
```

未配置时显示：

```text
未配置 Supabase
```

不会再显示硬编码示例数据。

## 五、验收结果（2026-09-25）

实际 Project Ref：

```text
slykelkslviydmnfrcqf
```

正确 Project URL：

```text
https://slykelkslviydmnfrcqf.supabase.co
```

处理结果：

- 项目当时处于 Paused，已通过 Dashboard 恢复。
- 006 迁移已在 SQL Editor 执行成功。
- 新版 Publishable / Secret API Key 已写入本地 gitignored 环境文件。
- `/api/track` 写入真实事件成功。
- `/api/analytics` 返回 `configured:true`、`source:supabase`、`empty:false`。
- 前端看板已显示真实事件数、7 日活跃和今日事件。
