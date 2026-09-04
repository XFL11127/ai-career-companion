# Part C 交接与推送日志

> 状态：已完成本地验收，等待评审与合并。  
> 分支：`part-c/ai-memory-foundation`  
> 基线：`基础骨架@7864dd9`  
> 范围：Gate 0 工程健康恢复 + Part C AI / 记忆服务边界。

## 本次交付

### Gate 0：工程健康

- 固定 Node.js `22.22.2`、npm `10.9.7`，并在仓库中声明 Node `>=22.18.0 <23`。
- 清理被跟踪的 Turbo / Wrangler 生成物，并补齐忽略规则。
- 修复 clean install、ESLint、TypeScript、生产构建与 Node 原生测试。
- 对齐 CI 的 npm 安装方式及检查项，消除已知高危生产依赖问题。

### Part C：AI 与记忆边界

- 浏览器只访问 Next.js BFF：`/api/skill/*`、`/api/memory`；不再直接访问 Worker，也不传递 `userId`。
- 五个 Skill 使用共享 Zod DTO 校验，限制正文、上下文和列表尺寸；错误输入返回 `400`。
- BFF 实现按客户端地址与 Skill 名称的实例级限流：每分钟 12 次；超限返回 `429` 与 `Retry-After`。
- NDJSON 响应附带 `meta.provider`、`meta.degraded`、`meta.reason`；没有模型密钥或模型调用失败时，界面明确标出降级示例，不伪装为真实 AI 内容。
- Worker 缩小为内部 embedding 适配器：仅 `POST /internal/embed`，必须携带 `Authorization: Bearer <INTERNAL_WORKER_SECRET>`，只绑定 Cloudflare Workers AI 的 BGE-M3 模型。
- 数据库身份、迁移和 RLS 尚未到位前，`/api/memory` 显式返回 `memory_persistence_not_ready`；不会产生“已经写入长期记忆”的假象。

详细接口契约见 [part-c-ai-memory-contract.md](./part-c-ai-memory-contract.md)。

## 已验证的验收结果

验证在 Node.js `22.22.2` / npm `10.9.7` 下完成：

| 检查项 | 结果 |
| --- | --- |
| `npm ci` | 通过（使用 npm 官方源完成可复现安装） |
| `npm test` | 通过，4 / 4 |
| `npm run lint` | 通过 |
| `npm run type-check` | 通过 |
| `turbo build --force` | 通过，无缓存构建 |
| `npm run format:check` | 通过 |
| Worker 冒烟 | `/health` 为 200；未带密钥的 embedding 请求为 401；旧公开 `/api/embed` 为 404 |
| 浏览器冒烟 | AI 助手的诊断与路径规划均可完成；结果页显示能力雷达 / 推荐岗位或 30/60/90 天计划，并在无模型密钥时显示降级说明 |

## 对接契约与配置

### 服务端环境变量

将 [`.env.example`](../.env.example) 复制为本地环境文件后按需填写。以下变量绝不可使用 `NEXT_PUBLIC_` 前缀：

| 变量 | 用途 | 生产状态 |
| --- | --- | --- |
| `AUTH_SECRET` | Auth.js 会话签名 | 必填 |
| `DEEPSEEK_API_KEY` | 实际生成五个 Skill 结果 | 必填（演示可用降级） |
| `WORKER_INTERNAL_URL` | Next.js BFF 访问 embedding Worker 的内部地址 | 记忆持久化启用时必填 |
| `WORKER_INTERNAL_SECRET` | Next.js 与 Worker 的共享内部密钥 | 记忆持久化启用时必填 |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅服务端迁移 / 管理任务使用 | 按最小权限配置，绝不下发浏览器 |

Worker 端单独通过 `wrangler secret put INTERNAL_WORKER_SECRET` 设置与 BFF 相同的内部密钥；不要把 DeepSeek、Supabase 或 service-role 密钥写入 Worker。

### 后续数据库 PR 的接入顺序

1. 配置 Supabase Auth，并从服务端会话获得可信用户 ID。
2. 创建 / 核对 `profiles`、`skill_runs`、`memory` 等表与 RLS，所有策略按 `auth.uid()` 限制所有者。
3. BFF 以服务端身份调用 `/internal/embed`；embedding 与原文在受 RLS 保护的 `memory` 表中落库。
4. 实现 `match_memory` Top-K RPC；浏览器只提交查询文本，不能读取向量或跨用户记录。
5. 用人工标注集验收 Recall 精度：Precision@5 目标不低于 `0.80`，未达到前保留关键词降级路径。

## 已知问题与优先级

### P0：合并 / 部署前必须完成

1. **Auth.js 未配 `AUTH_SECRET`。** 本地浏览器日志会出现 `/api/auth/session` 500 与 `MissingSecret`；匿名 Skill 主流程不受影响，但登录会话不可验收。配置环境变量并覆盖登录、登出、刷新会话测试。
2. **Supabase 身份、迁移和 RLS 尚未验收。** 当前记忆 API 是安全的“不就绪”降级，不具备长期记忆写入能力。需要按上节顺序单独 PR，并附 RLS 的跨用户越权测试。
3. **未配 `DEEPSEEK_API_KEY` 时只有 stub 结果。** 演示链路可用，但不能作为真实 AI 效果验收；部署前必须以非敏感样例验证五个 Skill 的真实流式结果与超时降级。

### P1：上线前建议完成

1. **限流是单实例内存实现。** 多实例 / Serverless 环境下不能形成全局配额。建议替换为 Upstash Redis 或 Cloudflare KV，并从“IP + Skill”升级为“用户 ID + IP”双维度限流。
2. **补充可观测性。** 记录请求 ID、模型耗时、降级原因、429 次数和 Worker embedding 失败率；日志中不得包含简历、对话全文、密钥或 embedding。
3. **补齐模型韧性。** 为 DeepSeek 加明确的超时、重试上限、熔断策略与备用模型；任一回退必须继续返回正确的 `meta`。
4. **完善测试。** 增加 BFF 的合法 / 非法请求、限流窗口、真实与降级 NDJSON、Auth 身份伪造、RLS 越权、Worker 密钥轮换等自动化测试。

### P2：产品和工程优化

1. 将 IndexedDB 的短期记忆、画像、成长数据逐步迁移为登录后云端同步，并为用户提供查看、编辑、删除和导出入口。
2. 为记忆检索加入评测集、召回质量仪表板与过期 / 遗忘策略，避免低质量记忆污染后续生成。
3. 统一 README 中历史 Worker 公开路由的表述，避免新成员按旧的 `/memory`、`/skill/*` Worker 合同接入；以本交接文档和 Part C 契约为当前事实来源。
4. 建立部署前检查：密钥存在性、RLS、来源限制、CORS、速率限制、依赖漏洞扫描、回滚路径和烟测脚本。

## 给下一位开发者的最短启动路径

```bash
nvm use
npm ci
npm test
npm run lint
npm run type-check
npm run build
```

本地只验证 UI 降级链路时，不填 AI / Supabase 密钥即可启动 Web；要验证登录、真实 AI 或长期记忆，必须先完成相应环境变量和外部服务配置。不要提交 `.env.local`、Worker 密钥或任何用户对话数据。

## 提交序列

| 提交 | 内容 |
| --- | --- |
| `75bcd0d` | `chore: restore Gate 0 engineering health` |
| `8d2aa41` | `feat(part-c): secure AI and memory service boundary` |
| 本提交 | Part C 交接、验收、风险与后续对接说明 |

