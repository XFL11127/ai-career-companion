# AI学职同伴（ai-career-companion）

> 面向**双非学生**的 AI Copilot 式学职陪伴产品 · iCAN 参赛项目

一个帮助学生完成「破局诊断 → 路径规划 → 实战练兵 → 信息差 → 成果包装」五步闭环的 Web 应用。后端接 DeepSeek 大模型，记忆层基于 Supabase + pgvector，全栈 Serverless 部署。

---

## 一、技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 14 (App Router) · React 18 · TypeScript 5.9 · Tailwind CSS 3.4 · lucide-react |
| 后端 | Cloudflare Workers · Hono 4 · zod 3 |
| AI | Vercel AI SDK 7 · @ai-sdk/deepseek（DeepSeek-V3 主力，Moonshot 备用）· 无 Key 时走 stub |
| 记忆/数据 | Supabase (PostgreSQL) · pgvector（1536 维向量）· 本地 IndexedDB/状态缓存 |
| 工程 | npm workspaces · Turbo 2.10 · ESLint · Prettier |
| 部署 | Vercel（前端）· Cloudflare Workers（后端）· Supabase（数据库） |

> ⚠️ **本机包管理器固定为 npm**（详见第四节「依赖配置」）。不要使用 `pnpm`，它在当前开发环境有链接故障。

---

## 二、项目结构

```
ai-career-companion/
├── apps/
│   ├── web/                      # 前端（Next.js 14，学生端产品界面）
│   │   └── src/app/
│   │       ├── page.tsx          # 首页：Kimi 式对话式入口（ChatShell + 左侧栏 + 历史 + 登录占位）
│   │       ├── login/page.tsx    # 登录占位页（功能开发中，免登录本地保存）
│   │       ├── (main)/
│   │       │   ├── diagnose/     # 破局诊断（五维雷达图，真实交互）
│   │       │   ├── plan/         # 路径规划（30/60/90 天，真实交互）
│   │       │   ├── practice/     # 实战练兵（真实交互）
│   │       │   ├── info/         # 信息差（真实交互）
│   │       │   └── package/      # 成果包装（真实交互）
│   │       ├── analytics/        # 数据看板（运营端，骨架占位）
│   │       └── api/skill/[...path]/  # BFF 代理（catch-all）：前端 → Worker；Worker 连不上自动 fallback 直连 LLM
│   │   └── src/components/
│   │       ├── chat-shell.tsx    # Kimi 式聊天壳（消息流 + 输入框 + Skill 切换 + 抽屉开关）
│   │       ├── sidebar.tsx       # 左侧栏（Skill 入口 + 新建会话 + 历史 + 登录）
│   │       └── skill-ui.tsx      # 共享 UI（ProseBubble / SkillCardView / RadarChart / 三态）
│   │   └── src/lib/              # api.ts(BFF) / db.ts(本地存储) / memory.ts(会话历史) / useChat.ts / useSkill.ts
│   └── worker/                   # 后端（Cloudflare Worker + Hono）
│       └── src/index.ts          # /health /memory /skill/{5个} 路由，接 llm 层
├── packages/
│   ├── types/                    # 共享契约（zod DTO + TS 类型，单一事实来源）
│   ├── utils/                    # 通用工具函数
│   └── llm/                      # 共享 LLM 调用层（DeepSeek，env-gated，无 Key 走 stub）
├── supabase/migrations/001_init.sql   # 数据库 schema（profiles/skill_sessions/memories + pgvector + RLS）
├── .github/workflows/ci.yml      # CI 流水线
├── package.json                  # 根：workspaces + turbo 脚本
├── pnpm-workspace.yaml           # 保留给 CI/部署环境（本机用 npm）
└── dev-web.bat                   # Windows 双击启动前端的脚本
```

**模块职责**
- `apps/web`：学生端全部界面，通过 `useSkill` hook → `/api/skill` → Worker 调大模型。
- `apps/worker`：Hono 服务，路由转发到 `packages/llm` 的 `runSkill`，负责真实 AI 推理与（未来）持久化。
- `packages/llm`：封装 Vercel AI SDK + DeepSeek，统一 5 个 Skill 的 prompt 与 zod 输出校验；无 `DEEPSEEK_API_KEY` 时返回 stub 演示数据，保证链路可演示。
- `packages/types`：前后端共享的 zod 契约，避免类型漂移。
- `supabase`：学生画像、Skill 会话、三层记忆（含向量）的持久化。

---

## 三、环境准备

### 1. Node.js（关键，版本已锁定）
Node 版本由仓库根目录的 **`.nvmrc`**（当前 `22.22.2`）和 `package.json` 的 **`engines.node`（>=18.17.0）** 共同约定，`npm install` 时若版本不符会直接报错（由 `.npmrc` 的 `engine-strict=true` 强制）。队友克隆后**版本自动对齐**，无需口头约定。

**队友按自己的环境任选一种方式拿到 Node 22：**

- **用 WorkBuddy 终端**（本机现状）：PATH 已自动配好，直接 `npm` 可用，无需任何操作。
- **Windows 普通终端**（IDEA / PowerShell）：Node 未挂系统 PATH 会报「无法识别」。把你的 Node 目录加进用户 PATH（示例路径为本机 WorkBuddy 托管目录，**请改成你自己的 Node 安装路径**）：
  ```powershell
  $dir = "C:\Users\asus-pc\.workbuddy\binaries\node\versions\22.22.2"   # ← 改成你机器上的 node.exe 所在目录
  $old = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($old -notlike "*$dir*") { [Environment]::SetEnvironmentVariable("Path", "$old;$dir", "User") }
  ```
  执行后**关闭并重开终端**即生效。
  > 手动添加（GUI）：Win+R → `sysdm.cpl` → 高级 → 环境变量 → 用户变量 `Path` → 编辑 → 新建 → 粘贴上面的 `$dir` 路径 → 确定。
  > 临时方案（不改 PATH）：每次用全路径执行，如 `C:\...\node\versions\22.22.2\npm.cmd run dev`。
- **Mac / Linux / WSL**：装好 `nvm` 后直接 `nvm use`（自动读取 `.nvmrc`）；或 `nvm install 22`。
- **没装 Node**：去 https://nodejs.org 装 LTS 22，再按上面把目录加进 PATH。

### 2. 安装依赖
```bash
npm install        # 已装过可跳过；依赖变更后再跑
```

### 3. 环境变量（可选，接真实 AI 才需要）
复制 `.env.example` 为 `.env.local` 并填写：

| 变量 | 用途 | 必填 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 真实调用 DeepSeek（Worker 端）。无则走 stub 演示数据 | 否（演示可空） |
| `NEXT_PUBLIC_WORKER_URL` | 前端代理目标，默认 `http://localhost:8787` | 本地否 |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 前端连 Supabase | 接 DB 时 |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker 服务端写库 | 接 DB 时 |

> 本地无 Key 也能完整跑通 UI（Skill 页返回 stub 数据）。部署到 Cloudflare 时用 `wrangler secret put DEEPSEEK_API_KEY` 注入，勿提交真实值。

---

## 四、依赖配置（重要）

**本仓库使用 npm workspaces，不要用 pnpm。**

根 `package.json` 关键字段：
```jsonc
{
  "packageManager": "npm@10.9.7",   // turbo 2.10 依赖此字段识别包管理器
  "workspaces": ["apps/*", "packages/types", "packages/utils", "packages/llm"]
}
```

workspace 内部依赖用 `"*"`（如 `"@ai-career-companion/types": "*"`），npm 与 pnpm 都兼容。

### ⚠️ 为什么不用 pnpm（本机）
在当前开发沙箱里，`pnpm 11.15.1` 存在**环境级链接故障**：`pnpm install` 报成功，但**不创建 `node_modules` 符号链接**，`apps/web` 里始终找不到 `next`/`react`，导致 `tsc`/`next build` 全部失败。已实测验证：
- `pnpm config` 不读取项目 `.npmrc`（`node-linker=hoisted` 被无视）；
- `--shamefully-hoist` + 关闭沙箱 + `allowBuilds` 全部无效；
- 在同机器 `/tmp` 副本复测 pnpm@11 **100% 复现**该故障；
- 同环境 **npm 安装正常**，依赖均为真实目录。

**结论**：本机固定 npm；仓库里的 `pnpm-workspace.yaml` / `pnpm-lock.yaml` 保留给 Vercel / CI 等正常机器使用，两者 lockfile 共存互不影响。

---

## 五、如何启动

### 最省事：双击启动
双击项目根目录的 **`dev-web.bat`** → 自动起前端 → 浏览器开 `http://localhost:3000`。

### 命令行
```bash
# 仅起前端（最常用，避开 Worker 的 Cloudflare 配置）
npm run web          # 或 npm start
#   → http://localhost:3000

# 前端 + 后端一起（需 Worker 的 wrangler 配置 / Cloudflare 账号）
npm run dev          # = turbo dev → 前端 :3000 + Worker :8787

# 生产构建 / 类型检查 / 规范
npm run build        # turbo build（前端 next build）
npm run check        # = turbo run type-check（web + worker 均 0 错）
npm run lint         # eslint
```

### IDEA 零打字
左侧 / 底部 **npm scripts** 面板（View → Tool Windows → npm）→ 点 `web` / `dev` / `build` / `check` 按钮即可。

> 打开后你会看到：首页是 **Kimi 式对话入口**（左侧栏 + 聊天流），5 个 Skill 详情页仍可直接访问（URL 如 `/diagnose`）；无登录时历史会话存浏览器 IndexedDB，刷新/重进不丢失。`/analytics` 看板与首页「今日行动卡片」目前是占位骨架，属预期状态。
>
> **演示要点**：在本机已配置 `DEEPSEEK_API_KEY`（写在 `apps/web/.env.local`，已被 gitignore）的情况下，5 个 Skill 会返回**真实 DeepSeek** 内容；同一 Skill 内连续提交可看到 L1 会话记忆生效。本地若未起 Cloudflare Worker，BFF 会自动 fallback 直连 LLM，响应里 `message: "ok (local llm fallback)"` 是**正常**的，AI 仍在真实运行。

---

## 六、当前进度

### ✅ 已完成（真实可用）
- **设计系统**：暖色编辑风（ink / sand / terracotta 色板，非对称布局，serif 标题），lucide-react 图标，入场 fade-up + 悬停微交互，语义化标签 + 移动优先。
- **Kimi 式对话式首页**：`page.tsx` = `<ChatShell />`，聊天即首页；散文回复 + 结构化卡片结果（诊断雷达 / 规划里程碑 / 练习题 / 资讯 / 资料包）。
- **左侧栏**（`sidebar.tsx`，免登录可用）：品牌区 → `新建会话` → 5 个 Skill 入口（破局诊断/路径规划/实战练兵/信息差/成果包装）→ 按时间分组的历史会话（今天/昨天/7天内/更早，悬停可删）→ 底部设置/帮助/登录。`lg` 以上常驻，`lg` 以下汉堡菜单侧滑抽屉。
- **会话历史与持久化**（`memory.ts`）：新增 `Conversation` 模型（id/skill/title/messages/时间戳），无登录时全部存 IndexedDB；切换 Skill / 新建 / 选历史前自动归档当前聊天，刷新重进可恢复；含旧版「每 Skill 一份聊天」数据的一次性迁移。
- **登录占位页**（`/login`）：说明「登录功能开发中、当前免登录本地保存」，含返回对话入口；真实登录后续接入。
- **5 个 Skill 页**（diagnose / plan / info / package / practice）：全部接 `useSkill`，含 **loading / error / empty 三态**，调用 Worker → DeepSeek 生成内容（无 Key 走 stub）。同一 Skill 内已带 **L1 会话记忆**：自动召回上一轮上下文注入 prompt，让 AI「记得」前文。
- **共享组件库** `components/skill-ui.tsx`：`RadarChart` / `Card` / `Pill` / `LoadingState` / `ErrorState` / `EmptyState`。
- **前端 lib**：`api.ts`（BFF 流式调用）、`db.ts`（本地存储）、`memory.ts`（会话历史 Conversation 模型 + L1 记忆）、`useChat.ts`（Kimi 式聊天 hook，按 Skill 构建输入/注入历史/流式渐进渲染）、`useSkill.ts`（Skill 详情页 hook）。
- **LLM 流式响应（性能优化）**：`packages/llm` 的 `streamSkill` 用 AI SDK `streamObject` 产出 partial；BFF 路由以 NDJSON 逐行推流，前端 `useSkill`/`api.ts` 边收边 `setData`，首字节 ~0.85s 即开始渲染，消除「转圈等 2.4s」的卡顿感。
- **`packages/llm`**：真实 LLM 调用层（Vercel AI SDK + DeepSeek，env-gated stub 回退），Worker 与 Web 共用。
- **`apps/worker`**：Hono 路由 `/health` `/memory` `/skill/{5个}`，已接 `runSkill` 真实推理；`runSkill` 通过参数接收 env（Worker 传 `c.env`、Web 回退 `process.env`），解耦 Cloudflare 无 `process.env` 问题。`/memory` 当前为 in-memory 占位，留 M3 接 Supabase。
- **`packages/types`**：zod 契约（Skill 名 / 画像 / 记忆 / 各 Skill 输入输出）；各 Skill input 新增可选 `context` 字段供记忆注入。
- **L1 会话记忆（P1 已完成）**：`src/lib/memory.ts` 用 IndexedDB 按 skill 存对话轮次，`useSkill` 调用前召回最近 N 条注入 prompt、调用后追加本轮。契合「免登即用」定位，无需后端账号即可演示记忆召回。
- **`supabase/migrations/001_init.sql`**：`profiles` / `skill_sessions` / `memories`（pgvector 1536 维 + ivfflat 余弦索引）+ RLS 行级安全。
- **CI**：`.github/workflows/ci.yml` 已配置。
- **验证**：`npm run check`（tsc web+worker 0 错）、`next build`（11 路由全过）。

### 🚧 占位 / 待填充
- **`/analytics` 数据看板**（运营端）：骨架占位，待 A+B 填充 Recharts 可视化与 KPI 体系。
- **首页「今日行动卡片」区域**：待 B 填充。

### 团队分工对照
- **A（队长/基础设施）**：Supabase 项目、Vercel/Cloudflare 部署、`/analytics` 数据层 + KPI。
- **B（前端）**：卡片引擎、5 Skill 页 UI/交互、首页行动卡片、看板 UI。
- **C（后端 AI）**：`packages/llm` 健壮化（多 Skill prompt、错误处理）、Mem0 记忆层接 pgvector、Worker 真实 Supabase 持久化。
- **D（数据测试）**：数据层测试、分析层 ETL / KPI 引擎。

---

## 七、已知问题 / 待清理

1. **ESLint 扁平配置（非阻断）**：仓库根使用 typescript-eslint v8 扁平配置（`eslint.config.js`）。`next build` 的 lint 步对个别规则（如 `@typescript-eslint/no-unused-expressions`）在旧解析下会有无害告警，不影响产物（12 路由均正常生成）。如需零告警，后续统一升级 web 端 ESLint 到 9 并收敛规则集。
2. **双 lockfile 共存**：本机用 `package-lock.json`，CI 用 `pnpm-lock.yaml`。若团队正式统一 npm，可删 `pnpm-workspace.yaml` + `pnpm-lock.yaml`。
3. **Skill 页真实 AI 响应**需配置 `DEEPSEEK_API_KEY`，否则返回 stub 演示数据（属预期降级）。

### 已修复 / 注意
4. **BFF catch-all 路由命名坑（已修复）**：原文件夹命名为 `api/skill/[...]`（缺 catch-all 参数名），Next 会把它当静态段，导致 `/api/skill/<skill>` 全部 404；已改名为 `api/skill/[...path]` 修复。以后若遇该路由 404，先确认文件夹名带参名。
5. **沙箱删除钩子（清大目录注意）**：在 WorkBuddy 开发沙箱里，所有 `rm -rf` / `Remove-Item` / `fs.rmSync` 会被「安全删除」钩子接管走回收站，`.next`、`node_modules` 这类大目录会**静默失败**。需清这类目录时，删单个小文件/小目录绕开，或在资源管理器手动删。
6. **流式只优化体感首字节，不加速模型**：Skill 响应已改为流式（首字节 ~0.85s 即渲染），但**完整结果总耗时仍取决于 DeepSeek 生成速度（约 2.4s），流式无法让它更快**。若要进一步压总时长：① 换更快模型（如 deepseek-chat 之外的小模型）；② 重复相同输入时直接读 IndexedDB 缓存秒出（已实现，刷新/重进页面命中）。

---

## 八、后续计划

| 阶段 | 重点 | 负责人 |
|---|---|---|
| 近期 | 填满首页行动卡片；打磨 5 Skill 页交互细节；`packages/llm` 多 Skill prompt + 错误处理 | B / C |
| 近期 | 统一 ESLint 版本；清理双 lockfile 决策 | A |
| 中期 | `/analytics` 看板（Recharts + KPI 三层仪表盘） | A + B |
| 中期 | Mem0 记忆层接 Supabase pgvector；Worker 真实会话持久化 | C + D |
| 中期 | 数据层测试 + 分析层 ETL/KPI 引擎 | D |
| 部署 | Vercel 部署前端；Cloudflare Workers 部署后端（`wrangler secret put` 注入 Key）；Supabase 推送 migration | A |

---

## 九、部署

- **前端 → Vercel**：导入仓库，`build` 命令 `npm run build`（或 `turbo build`），根目录即仓库根。
- **后端 → Cloudflare Workers**：`cd apps/worker && npm run deploy`（需 `wrangler login`）；机密用 `wrangler secret put DEEPSEEK_API_KEY`。
- **数据库 → Supabase**：在 Supabase 控制台执行 `supabase/migrations/001_init.sql`，并开启 RLS（已含策略）。
- CI 机器可使用 pnpm（正常环境无链接故障）；本机开发固定 npm。

---

## 十、项目约定

- **归档**：废弃原型 / 临时报告统一放项目外的 `Desktop/ican/_archive/`，不进项目根。
- **设计系统**：暖色编辑风 + lucide-react 图标 + loading/error/empty 三态，是前端默认规范。
- **记忆**：项目上下文与决策记录在 `.workbuddy/memory/`（每日日志 + 长期 MEMORY.md），不进版本库噪音。
- **包管理器**：本机 npm；不要提交未经验证的 pnpm 改动。
