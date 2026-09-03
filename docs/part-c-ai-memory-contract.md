# Part C：AI 与记忆服务契约

## 已实现的边界

- 浏览器只能调用 Next.js 的 `/api/skill/*` 与 `/api/memory`；不再直连 Cloudflare Worker，也不提交 `userId`。
- 五个 Skill 的所有输入使用共享 Zod 契约校验，并限制文本、上下文和数组长度。非法输入返回 HTTP 400。
- Skill BFF 按网络地址与 Skill 名称做每分钟 12 次的实例级限流，超过返回 HTTP 429 和 `Retry-After`。
- 每个 NDJSON Skill 响应均包含 `meta`：真实 DeepSeek 为 `{ provider: "deepseek", degraded: false }`；无 Key 或提供方失败会显式返回 stub 及降级原因。五个 Skill 面板会把真实/降级状态展示给用户。
- Cloudflare Worker 只处理 `POST /internal/embed`。它要求 `Authorization: Bearer <INTERNAL_WORKER_SECRET>`，仅使用 Workers AI 的 `@cf/baai/bge-m3`，不持有 Supabase 或 DeepSeek 凭证。
- `/api/memory` 已固定为 BFF 安全边界。在 Supabase Auth、`memory` 表迁移和 RLS 完成前，它返回显式的 `memory_persistence_not_ready` 降级结果，不会伪造写入成功。

## 供后续 PR 对接的接口

- `memoryWriteRequestSchema` 与 `memorySearchRequestSchema` 是浏览器请求 DTO；其中没有 `userId` 或 embedding。
- BFF 从登录会话导出用户 ID，在数据库端调用 `match_memory` Top-K RPC；不要把全量向量或 service-role key 下发到浏览器或 Worker。
- BFF 调 Worker 的 `/internal/embed` 时使用仅服务端可见的 `WORKER_INTERNAL_URL` 和 `WORKER_INTERNAL_SECRET`。

## 验收指标

| 指标 | 当前约束 |
| --- | --- |
| Skill 请求 | 五种名称受控；非法输入 400；过频 429；结果带 provider/degraded 状态 |
| 降级 | 无 DeepSeek Key 或调用失败不伪装为真实结果；Worker embedding 不可用返回 503 |
| 数据边界 | 前端不直连 Worker；请求 DTO 不带 userId；Worker 不含 Supabase service role binding |
| 记忆检索 | Auth + RLS 合入后用 DB Top-K RPC；目标为人工集精度@5 ≥ 0.80，未验收前保持 keyword 降级 |

## 仍依赖 PR 2 / PR 3 / PR 4

1. Supabase Auth、唯一编号迁移、RLS 与 server-side identity。
2. `skill_runs` 真正的每次调用记录与 user profile / growth 持久化。
3. `memory` 写入、Worker embedding 调用和 PostgreSQL pgvector Top-K RPC 的闭环，以及精度集验收。
