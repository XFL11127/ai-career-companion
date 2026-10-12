---
name: career-plan-306090
description: 仓库 plan 能力的 DuMate 实现。基于五维诊断或用户目标，生成 0-30、31-60、61-90 天可执行成长路径。用户要求“接下来三个月做什么”“帮我做计划”“给我行动路线”时触发。
---

# career-plan-306090 · 路径规划

## 用途
把诊断差距转化为能照着执行的阶段计划，而不是愿景清单。

## 输入
- radar：diagnose 输出的五维差距，可选；
- goal：目标岗位或成长目标，可选；
- context：会话记忆，可选；
- profile：用户画像，可选。

## 输出
- reply：2-4 句中文，鼓励用户并指出第一阶段性价比最高的一件事；
- milestones：3 个阶段：
  - 0-30
  - 31-60
  - 61-90

每阶段包含：
- title
- actions：1-3 个 action card；
- action 字段：id、title、description、type、status。

type 只能是：
- study
- project
- apply
- review

## 硬性规则
- 每阶段最多 3 个 action，不得堆积任务；
- description 必须写清做到什么程度算完成、去哪里做或用什么渠道；
- apply 类必须写投递数量和筛选标准，例如“投 10 个远程或二线城市实习岗，优先官方来源和可核验公告”；
- 优先处理差距最大的维度；
- 不排入现实无法完成的时间量；
- 不虚构岗位、企业或结果；
- 只输出符合契约的结构化内容。

## 验收标准
- 恰好三个阶段 0-30、31-60、61-90；
- 每阶段 1-3 个 action；
- 所有 type 合法；
- 计划能直接进入 artifact-pack、interview 或 practice。
