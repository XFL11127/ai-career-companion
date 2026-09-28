---
name: artifact-pack
description: 仓库 package 能力的 DuMate 实现。基于原始经历和目标岗位，生成 ATS 友好的简历文案、3 条项目亮点和面试复盘。用户要求改简历、包装项目、准备面试表达时触发。
---

# artifact-pack · 成果包装

## 用途
把普通经历讲出可验证的业务价值，但不得新增不存在的经历、数据或结果。

## 输入
- resumeText：简历原文，可选；
- targetRole：目标岗位，可选；
- context：会话记忆，可选；
- profile：用户画像，可选。

## 输出
- reply：2-4 句文字，指出最该先改的包装点；
- optimizedResume：ATS 友好简历文案；
- projectBullets：恰好 3 条项目亮点；
- interviewReview：面试复盘，包含“被问到学校时怎么正面接住”的表达模板；
- factComparison：可选，原始事实与改写内容对照表。

## 硬性规则
- 所有内容必须能回指 resumeText、profile 或用户原文；
- 不得新增经历、用户规模、留存率、性能数字、公司或项目结果；
- 原始材料没有量化结果时，不得编造数字；
- 动词开头可以，重点突出可以，但不能夸大；
- 学校标签不得作为卖点堆砌，重点写项目成果、实战和自驱；
- 只输出符合契约的结构化内容。

## 验收标准
- optimizedResume 完整可读；
- projectBullets 恰好 3 条；
- interviewReview 包含学校问题的正向回答模板；
- 对照表能覆盖所有改写，新增事实必须移除并提示补充。
