# 环境 / 依赖多发问题清单（npm 及开发环境）

> **本文件是「npm 与本地开发环境多发问题」的单一事实源（canonical checklist）。**
> 任何 AI 工具（WorkBuddy / Trae / dumate / Claude）或队友在排查环境/依赖问题时，应先读本文件，再结合 `docs/项目说明.md` §3.1、`.workbuddy/memory/MEMORY.md`（本地环境工具链章节）。
>
> - **最后核对**：2026-08-14，基于 `基础骨架` 分支**实际代码与配置**（非计划书）。
> - **维护规则**：本清单的增删改**必须走 §5 的工作流**（Issue → 分支 → PR → CI → 验收），禁止直接 push 到 `基础骨架`。
> - **真相源层级**：本文件 + `docs/项目说明.md` + `docs/ROADMAP.md` + `docs/TASKBOARD.md`（仓库内 markdown，AI 无关，可移植）。

---

## 1. 清单范围（Scope）

**本清单收录**：在 `ai-career-companion` 项目中**反复出现、可复现**的 npm / 包管理器 / Node 运行时 / 构建工具（turbo）/ 部署（Cloudflare/Vercel）/ `package.json` 配置类环境问题。

**本清单不收录**（避免范围蔓延）：

- 业务代码 bug（见 `docs/项目说明.md` §10 常见 bug 表）。
- 偶发的网络抖动、云端配额耗尽等一次性事件（除非能稳定复现并沉淀为规避方案）。
- 与本项目技术栈无关的通识问题（如通用 git 用法）。

**核心约束（贯穿全清单）**：本仓库 **统一使用 npm**，pnpm 因 `workspace` 内部依赖 `*` 写法冲突而**全链路禁用**（本机 / CI / Cloudflare 均会 404）。

---

## 2. 内容结构定义（Item Schema）

每条问题为一个**自包含、带稳定 ID 的块**，字段如下：

| 字段       | 含义                                                         |
| ---------- | ------------------------------------------------------------ |
| **ID**     | `NPM-01` ~ `NPM-09`（新增续 `NPM-10`+；**ID 一旦分配不可复用/重排**，保证引用稳定） |
| **分类**   | 包管理器 / 运行时 / 构建工具 / 部署 / 配置                    |
| **触发场景** | 在什么操作下会暴露该问题                                     |
| **现象**   | 可观测的错误/症状（含关键报错文案）                           |
| **根因**   | 技术根因（指向具体文件/配置）                                 |
| **解决方案** | 具体命令或配置改动（可直接执行）                             |
| **验证**   | 如何确认已修复/已规避                                        |
| **状态**   | 活跃（仍会踩） / 已规避（策略层解决） / 已修复（已落配置）     |
| **关联**   | 指向 `MEMORY.md` 条目 / `项目说明.md` 章节 / 提交记录         |

> **结构约定**：新增条目采用**追加（append-only）**，编辑已有条目仅改对应 ID 块内的字段——这样不同条目的并发修改几乎不会冲突（见 §5.3）。

---

## 3. 九条多发问题清单

### NPM-01 · pnpm 在本机/CI/Cloudflare 均不可用

- **分类**：包管理器
- **触发场景**：执行 `pnpm install` / `pnpm run ...`（本机、GitHub Actions、Cloudflare 部署）
- **现象**：
  - 本机：`pnpm install` 报 `Done` / exit 0，但 `node_modules` 不建符号链接，`apps/web` 里 `next`/`react`/`zod` 全缺；`.npmrc` 的 `node-linker=hoisted` 被无视（`.modules.yaml` 恒为 isolated）。
  - CI/Cloudflare：装 workspace 内部包 `@ai-career-companion/*` 报 `404`，把 `*` 当成 registry 版本拉取。
- **根因（双根因）**：
  1. 本机 pnpm 11.15.1 **链接机制故障（环境级，不可配置修复）**，同机器 `/tmp` 副本复测 100% 复现。
  2. workspace 内部依赖用 `*` 写法 → npm 正常，但 **pnpm 当成 registry 版本拉取报 404**（与 `workspace:*` 协议互斥，无单一协议同时满足两者）。
- **解决方案**：**全仓库统一用 npm**；monorepo 用根 `package.json` 的 `workspaces` 字段，内部依赖保持 `*`，**禁用 pnpm**。
- **验证**：`npm install` 成功生成 `node_modules`；`npm run type-check` 0 报错；CI 的 npm job 全绿。
- **状态**：已规避（统一 npm 策略）
- **关联**：`MEMORY.md` 本地环境工具链 #40 / #42 / #43

### NPM-02 · 外部终端 `npm` 命令不识别

- **分类**：运行时 / 环境
- **触发场景**：在 IDEA 终端 / PowerShell / 系统 `cmd` 直接敲 `npm` / `npx`
- **现象**：`npm 不是内部或外部命令` / `command not found: npm`
- **根因**：本机**无系统级 Node**；Node/npm 仅存在于 WorkBuddy 托管目录 `C:\Users\asus-pc\.workbuddy\binaries\node\versions\22.22.2\`（含 `node.exe` / `npm.cmd` / `npx.cmd`）。
- **解决方案**：
  - 将该目录加入**用户/系统 PATH**（IDEA/PowerShell 重开即生效）；或调用 `npm.cmd` 全路径。
  - WorkBuddy 自带 git bash 已自动加此 PATH，仓库内 `node_modules` 已装好，配 PATH 后直接 `npm run dev` 即可。
- **验证**：新开终端执行 `npm -v` 正常输出版本号。
- **状态**：活跃（队友在 IDEA/PowerShell 常踩）
- **关联**：`MEMORY.md` 本地环境工具链 #46

### NPM-03 · turbo 报 `Could not resolve workspace`

- **分类**：构建工具
- **触发场景**：`npm run dev` / `npm run build`（经 `turbo` 编排）
- **现象**：`turbo` 报错 `Could not resolve workspace`
- **根因**：根 `package.json` 缺 `packageManager` 字段，`turbo`（2.10.5）靠它识别包管理器；缺失时回退逻辑失败。
- **解决方案**：根 `package.json` 保留唯一 `"packageManager": "npm@10.9.7"`（删 `devEngines` 块后必须补）。
- **验证**：`npm run dev` 正常启动 turbo 编排；`npm run type-check` 0 报错。
- **状态**：已修复（根已加 `packageManager`）
- **关联**：`MEMORY.md` 本地环境工具链 #47

### NPM-04 · `npm --workspace X dev` 语法错误

- **分类**：命令语法
- **触发场景**：只想启动/构建某个 workspace（如仅前端）
- **现象**：直接报错 `unknown command` 或忽略 `--workspace`
- **根因**：正确语法是 `npm run <script> --workspace <name>`，`npm --workspace X <script>` 顺序错误。
- **解决方案**：用根别名 `npm run web`（= `npm --workspace @ai-career-companion/web run dev`），或完整写法 `npm run dev --workspace @ai-career-companion/web`。避免 `wrangler dev`（需 Cloudflare 配置）。
- **验证**：`npm run web` 起前端于 `localhost:3000`；`npm run build --workspace @ai-career-companion/web` 构建通过。
- **状态**：活跃（已文档化，靠别名规避）
- **关联**：`MEMORY.md` 本地环境工具链 #47

### NPM-05 · Cloudflare Worker 部署 404

- **分类**：部署
- **触发场景**：Cloudflare 用 pnpm 部署 `apps/worker`
- **现象**：部署崩溃，找不到 `@ai-career-companion/llm` / `@ai-career-companion/types`
- **根因**：同 NPM-01(b) —— 内部依赖 `*` 写法与 pnpm `workspace:*` 协议冲突导致 404。
- **解决方案**：部署也用 `npm install`（**禁用 pnpm**）；`npx wrangler deploy --config apps/worker/wrangler.toml`（根目录 `/` 下 wrangler 找不到 toml，必须 `--config`）；Cloudflare 配 `DEEPSEEK_API_KEY` secret。
- **验证**：Worker 部署成功，`GET /health` 返回 200。
- **状态**：已规避（统一 npm）
- **关联**：`MEMORY.md` 部署配置 #56 / #66

### NPM-06 · `Invalid package manager specification`

- **分类**：配置
- **触发场景**：Cloudflare 解析 `devEngines.packageManager.version`
- **现象**：Cloudflare 报 `Invalid package manager specification (pnpm@^x.y.z)`
- **根因**：版本号带 caret `^`（如 `"^x.y.z"`），Cloudflare 解析器不接受范围写法。
- **解决方案**：去掉 caret，或**删除 `devEngines` 块**，改用顶层 `"packageManager": "npm@x.y.z"`（精确版本）。
- **验证**：Cloudflare 构建不再报该错；顶层 `packageManager` 为精确 `npm@10.9.7`。
- **状态**：已规避（删 devEngines，顶层 npm）
- **关联**：`MEMORY.md` 部署配置 #57

### NPM-07 · `ERR_PNPM_MINIMUM_RELEASE_AGE` 拒装

- **分类**：包管理器 / 供应链
- **触发场景**：pnpm 尝试安装发布 <1 天的 dev 依赖（如 `@typescript-eslint/*`、`postcss`、`prettier`）
- **现象**：`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 拒绝安装
- **根因**：pnpm 11 供应链策略 `minimumReleaseAge` 默认拦截过新发布的包。
- **解决方案**：**不用 pnpm**；若强用需 `pnpm install --config.minimumReleaseAge=0`。
- **验证**：改用 npm 安装无此问题；CI 跑 npm job 全绿。
- **状态**：已规避（统一 npm）
- **关联**：`MEMORY.md` 本地环境工具链 #41

### NPM-08 · 双 lockfile 残留（pnpm-lock.yaml + package-lock.json）

- **分类**：配置 / 依赖
- **触发场景**：仓库根同时存在两份 lockfile
- **现象**：不同工具自动选其一，可能导致依赖树不一致、CI 与本地漂移。
- **根因**：历史双 PM 策略（计划书写 pnpm，本机实际用 npm）遗留。
- **解决方案**：`pnpm-lock.yaml` 已弃用可删除；CI / 部署只认 `package-lock.json`；全仓库统一 npm。
- **验证**：根目录仅 `package-lock.json`；`npm ci` 可复现安装。
- **状态**：已规避（CI 已改 npm，lockfile 待清理）
- **关联**：`MEMORY.md` 本地环境工具链 #44 / #66

### NPM-09 · 根 `package.json` 重复 `packageManager` 键

- **分类**：配置
- **触发场景**：根 `package.json` 同时存在 `packageManager: npm@...` 与 `packageManager: yarn@...`
- **现象**：JSON 解析取最后一个 → 实际变为 `yarn`；CI 中 turbo 去找 yarn 而 Runner 无 yarn → 构建崩。
- **根因**：历史残留的 yarn 行未清理，与 npm 行形成重复 key。
- **解决方案**：删除 yarn 行，唯一保留 `"packageManager": "npm@10.9.7"`（2026-08-14 已修）。
- **验证**：`node -e "console.log(require('./package.json').packageManager)"` 输出 `npm@10.9.7`；JSON 合法无重复键。
- **状态**：已修复（2026-08-14）
- **关联**：`2026-08-14` 工作日志

---

## 4. 存储与维护方式（Storage & Maintenance）

**存储位置（单一事实源）**：

- 路径：`docs/npm-env-issues.md`（仓库内，随 `基础骨架` 分支版本化）。
- 同源文档：`docs/项目说明.md`、`docs/ROADMAP.md`、`docs/TASKBOARD.md` 构成「AI 无关真相源簇」，任何 AI 工具与队友 `pull` 即同步。

**维护原则**：

1. **ID 稳定**：`NPM-01..09` 分配后不可重用、不可重排；新增条目追加 `NPM-10`+，编辑只改对应块内字段。
2. **状态机**：每条带 `状态`（活跃 / 已规避 / 已修复），变更时同步更新，使清单始终反映当前实况。
3. **不内联重复**：`项目说明.md` §10.5 仅做**指针 + 9 行摘要**，完整内容以本文件为准，避免双源漂移。
4. **版本化**：所有改动经 git commit 进 `基础骨架`，禁止直接保护分支强推。
5. **关联回溯**：每条 `关联` 字段指向 `MEMORY.md` 或具体章节，保证「为什么这么定」可溯源。

---

## 5. 变更整合工作流（与现有工作流合并与同步）

> 目标：当某条 npm 问题发生**修改 / 新增 / 状态变更**时，其变更能**无缝并入当前 `项目说明.md` §11 的工作流**，且可自动化验证，不产生双源漂移或冲突。

### 5.1 触发条件（Triggers）

满足任一即启动本流程：

1. **CI 失败**：`.github/workflows/ci.yml` 的 npm job（lint / type-check / build）出现新的或已知的 npm/环境类报错。
2. **队友上报**：通过 Issue（标签 `env/npm`）或 Discussion 报告一个可复现的本地环境问题。
3. **版本变更**：升级 Node / npm / 某关键依赖，或改动 `package.json` 的 `workspaces` / `packageManager`。
4. **偏差发现**：开发中发现与 NPM-01~09 描述不符的新根因或新规避方案。

### 5.2 合并步骤（Merge Steps）—— 复用 §11.2 闭环

```
① 开 Issue（标签 env/npm + priority/*）          ← 引用受影响条目 ID（如 "NPM-01 仍踩"）或 "新增条目"
   │
② 切分支 docs/npm-NPM-XX（或 fix/env-*）             ← 从 基础骨架 切出，短生命周期
   │
③ 编辑 docs/npm-env-issues.md                        ← 改对应 ID 块；新增则追加 NPM-10+
   │
④ 本地验证                                            ← npm install 成功 + npm run type-check 0 报错
   │
⑤ 提 PR（标题含 Closes #编号）                       ← 关联 Issue，触发 CI npm job
   │
⑥ CI npm job 全绿 + ≥1 人评审                          ← 复用 §9 分支纪律 / §11.3 评审
   │
⑦ 合入 基础骨架                                        ← GitHub Projects 自动移卡「待审核」
   │
⑧ 队长验收 → 卡移「完成」+ Issue close                  ← 复用 §11.4 移卡规则
   │
⑨ 回到 ROADMAP 下一迭代循环
```

### 5.3 冲突处理（Conflict Handling）

- **低冲突设计**：每条问题为独立 ID 块 + 追加式新增，不同条目的并发修改落在不同行，GitHub 极少产生冲突标记。
- **同条目并发**：若两人改同一 `NPM-XX` 块，后合并的 PR 在 GitHub 显示冲突标记 → 解决方式：
  1. 本地 `git pull --rebase 基础骨架` 拉最新；
  2. 手工合并两块差异（保留更完整的根因/解决方案）；
  3. 重跑 `npm run type-check` 确认 0 报错；
  4. `git push` 更新 PR，CI 重跑。
- **锁机制（轻量）**：`TASKBOARD.md` 待办列对「环境/依赖文档维护」类卡片标注负责人 + 分支，避免两人同时改同一文件（复用 §11.4 规则 1）。

### 5.4 验证机制（Verification）

**自动化（CI 强制）**：

- `.github/workflows/ci.yml` 三个 npm job（lint / type-check / build）必须全绿——这是清单改动的最低门槛。
- **推荐追加文档校验步骤**（可选，保障清单与代码一致）：在 ci.yml 增加一个 `docs-check` job，PR 触碰 `docs/npm-env-issues.md` 时执行：

```yaml
  docs-check:
    name: Docs & Env Checklist Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm install
      - run: npm run type-check
      - name: Validate npm-env-issues checklist
        run: |
          node -e "
          const fs=require('fs');
          const txt=fs.readFileSync('docs/npm-env-issues.md','utf8');
          const ids=['NPM-01','NPM-02','NPM-03','NPM-04','NPM-05','NPM-06','NPM-07','NPM-08','NPM-09'];
          const missing=ids.filter(id=>!txt.includes('### '+id));
          if(missing.length) { console.error('Missing checklist items:', missing.join(',')); process.exit(1); }
          const pm=require('./package.json').packageManager;
          if(!pm.startsWith('npm@')) { console.error('packageManager must be npm, got', pm); process.exit(1); }
          console.log('checklist OK, packageManager =', pm);
          "
```

**本地验证（人/AI 执行）**：

- `npm install` 成功 → `npm run type-check` 0 报错（见 `项目说明.md` §8 标准）。
- 对受影响的 `NPM-XX` 条目，按该条「验证」字段逐步确认状态变更正确。

### 5.5 自动化衔接（保持清单与工作流一致）

- **与 §11 同源**：本流程完全复用 `项目说明.md` §11.2（需求→验收闭环）、§11.3（角色动作）、§11.4（看板移卡）、§9（分支纪律）——清单改动不是特殊通道，而是工作流的一个普通 Issue 类型（`env/npm` 标签）。
- **看板可见**：`TASKBOARD.md` 待办列可直接建「环境文档维护」卡，移卡规则与功能卡一致，队友在 GitHub Projects 实时可见。
- **AI 可驱动**：WorkBuddy / 其他 AI 读 `项目说明.md` §0 启动序列后，会自动读到本文件引用；当 CI 报 npm 类错误时，AI 可建议「对应 NPM-XX 已规避，请确认 X 步骤」或「新增 NPM-10」，并给出 §5.2 的 PR 模板。

---

## 附录：条目速查表

| ID      | 分类     | 一句话                                    | 状态     |
| ------- | -------- | ----------------------------------------- | -------- |
| NPM-01  | 包管理器 | pnpm 不可用（链接故障 + `*` 404）         | 已规避   |
| NPM-02  | 运行时   | 外部终端 `npm` 不识别（无系统 Node）       | 活跃     |
| NPM-03  | 构建工具 | turbo `Could not resolve workspace`        | 已修复   |
| NPM-04  | 命令语法 | `npm --workspace X dev` 顺序错             | 活跃     |
| NPM-05  | 部署     | Cloudflare 部署 404（同 pnpm 冲突）        | 已规避   |
| NPM-06  | 配置     | `Invalid package manager specification`   | 已规避   |
| NPM-07  | 供应链   | `ERR_PNPM_MINIMUM_RELEASE_AGE` 拒装        | 已规避   |
| NPM-08  | 配置     | 双 lockfile 残留                          | 已规避   |
| NPM-09  | 配置     | 根 package.json 重复 packageManager 键     | 已修复   |

> 本文件为「环境/依赖真相」，与 `项目说明.md` §3.1（技术栈表）、`MEMORY.md`（本地环境工具链）互为补充，差异以本文件 + 实际代码为准。
