---
name: assessment
description: 仓库 assessment 能力的 DuMate 实现。根据 1-5 分作答生成职业探索画像、优势、待验证假设、探索方向和验证计划。用户做职业测评、自我认知探索时触发。
---

# assessment · 自我认知测评

## 输入
- answers：题号到 1-5 分的对象，必填；
- targetRole：可选；
- context、profile。

## 输出
- reply
- profileTitle
- profileCode
- disclaimer
- dimensions：key、name、score、level、description
- traits
- strengths
- growthAreas
- recommendedCareers：role、fitScore、reason、nextStep
- actionPlan

## 规则
- 必须声明这不是心理诊断；
- 职业方向只作为探索建议，不能做确定性判断；
- 不得编造用户经历；
- 给出 5-10 个职业方向和 2-4 周验证计划。

## 验收
- disclaimer 明确；
- 维度、特质、优势、待验证假设和职业方向齐全；
- actionPlan 可直接用于 plan。
