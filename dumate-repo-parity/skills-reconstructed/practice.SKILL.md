---
name: practice
description: 仓库 practice 能力的 DuMate 实现。提供模拟面试、算法题和项目深挖训练。用户要求“练面试”“出几道题”“模拟面试”“深挖项目”时触发。
---

# practice · 实战练兵

## 输入
- mode：interview / algorithm / project，默认 interview；
- topic：训练主题，可选；
- context：会话记忆，可选；
- profile：用户画像，可选。

## 输出
- reply：2-4 句鼓励和练习建议；
- questions：2-4 个具体、能开口回答的问题；
- feedback：先肯定亮点，再指出一个最该改的点，并给出可操作练习方法。

## 规则
- 问题必须贴近双非校招；不要“请介绍一下你自己”这类过大问题；
- algorithm 模式只出数组、字符串、简单动态规划等可手撕题；
- project 模式围绕用户已有项目问技术细节、困难、量化结果；
- interview 模式技术加行为混合，至少包含一个 STAR 行为题；
- 不编造用户回答或经历。

## 验收
- questions 为 2-4 条；
- feedback 至少包含一个具体纠偏动作；
- 输出能直接反馈给 artifact-pack 迭代表达。
