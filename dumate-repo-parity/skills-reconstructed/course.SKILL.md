---
name: course
description: 仓库 course 能力的 DuMate 实现。把讲义、教材、课件或笔记转成摘要、概念、抽认卡、小测和学习计划。用户上传学习资料、要求讲解或复习时触发。
---

# course · 课程学习助手

## 输入
- materialText：学习资料，必填；
- materialName、goal、level：可选；
- context、profile。

## 输出
- reply
- summary
- concepts：term、explanation、example、whyItMatters
- flashcards：id、front、back、tags
- quiz：id、type、question、options、answer、explanation
- studyPlan：dayRange、goal、tasks
- misconceptions

## 规则
- 严格基于 materialText；
- 资料没有展开的内容必须标注“资料未展开”；
- 不得编造教材结论、引用或考试原题；
- 学习计划要可按天执行。

## 验收
- 摘要、概念、卡片、小测和计划齐全；
- 小测答案能从资料中验证；
- 不出现资料外的事实性补充。
