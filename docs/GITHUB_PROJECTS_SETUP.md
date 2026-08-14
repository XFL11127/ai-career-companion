# GitHub Projects V2 配置指南（团队实时工作台）

> 目标：在 GitHub 上建一个**实时看板**，任何有仓库权限的队友打开即见最新进度，无需装 WorkBuddy 或任何工具。
> 本指南只需在 GitHub Web UI 点几下，约 10 分钟。仓库：`github.com/XFL11127/ai-career-companion`

---

## 步骤 1：建 Project（Board 模板）
1. 进仓库 → 点 **Projects** 标签 → **New project**。
2. 选 **Board** 模板 → 命名 `AI学职同伴工作台`。
3. 已有的 Open Issues 会自动进 **Todo** 列。

## 步骤 2：加自定义字段（右上角 ⚙️ → Fields）
| 字段 | 类型 | 值 |
|---|---|---|
| Status | 单选择 | 待办 / 进行中 / 待审核 / 完成 |
| 优先级 | 单选择 | 🔴阻断 / 🟡高 / 🟢中 / ⚪暂缓 |
| 工作量 | 单选择 | XS / S / M / L |
| 需求来源 | 文本 | 谁/哪次对话/哪个 Issue |

## 步骤 3：加视图
- **Board 视图**：按 Status 分组（待办/进行中/待审核/完成）。
- **Roadmap 视图**：按里程碑/日期，看循环节奏。
- **Table 视图**：按优先级筛选"未完成的高优项"。

## 步骤 4：开启内置自动化（⚙️ → Workflows）
- *Item added to project* → 状态设「待办」。
- *PR opened* → 状态设「进行中」（需 PR 关联 Issue）。
- *PR merged* → 状态设「待审核」。
- *Issue closed* → 状态设「完成」。

## 步骤 5：让 Issue 成为需求入口（溯源）
- 在仓库建 Issue 模板（见 `.github/ISSUE_TEMPLATE/`），强制填 **需求来源 / 优先级 / 验收标准**。
- 每条需求 = 1 个 Issue；PR 用 `Closes #编号` 关联 → 自动移卡。
- 这样"谁在哪次对话提的需求"全程可追溯。

## 步骤 6：设为公开/团队可见
- 默认 Private（仅协作者）。如需评委看，可单独分享 Project 链接或设为 Public。

---

## 与仓库内 markdown 看板的关系
- **markdown（`TASKBOARD.md`/`ROADMAP.md`）** = 可移植真相源，AI 和人都能直接改，不依赖 GitHub。
- **GitHub Projects** = 人类实时视图，队友最爱看的形式。
- 两者互补：AI 维护 markdown； humans 看 Projects。每周用 `project-automation.yml`（见 `.github/workflows/`）或手动核对一次即可。
