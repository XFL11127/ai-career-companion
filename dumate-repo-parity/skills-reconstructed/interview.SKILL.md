---
name: interview
description: 仓库 interview 能力的 DuMate 实现。根据简历和 JD 生成 4-6 道定向面试题、STAR 提示、评分卡和追问。用户准备面试、想模拟问答时触发。
---

# interview · 模拟面试舱

## 输入
- targetRole
- resumeText，可选
- jobDescription，可选
- mode：technical / behavioral / mixed
- language：zh / en / bilingual
- priorAnswers
- context、profile

## 输出
- reply
- questions：id、category、question、intention、starHint、sampleAnswer
- scoreCard：clarity、structure、relevance、depth、overall、feedback
- followUps
- improvementPlan

category 只能是：自我介绍、技术、项目、行为、反问。

## 规则
- 生成 4-6 道题；
- 有 priorAnswers 时给出评分和追问，没有回答时 scoreCard 可省略；
- 不得编造用户经历或项目细节；
- sampleAnswer 只能提供回答框架，不能替用户添加不存在的成果。

## 验收
- 题目数量 4-6；
- 每题都有意图和 STAR 提示；
- 有回答时输出评分卡和提升计划。
