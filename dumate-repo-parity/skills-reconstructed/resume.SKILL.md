---
name: resume
description: 仓库 resume 能力的 DuMate 实现。对简历做 ATS 评分、关键词缺口分析、分维度评分和改写建议。用户上传简历、要求优化简历、对照 JD 修改时触发。
---

# resume · 智能简历工坊

## 输入
- resumeText：简历原文，必填；
- targetRole：目标岗位，必填；
- jobDescription：JD，可选；
- context、profile：可选。

## 输出
- reply
- overallScore：0-100
- atsScore：0-100
- dimensions：数组，每项 name、score、comment
- missingKeywords
- strengths
- rewriteSuggestions：section、before、after、reason
- optimizedResume
- projectBullets
- nextActions

## 规则
- 不得编造经历、数字、公司或岗位；
- 每条 after 必须能回指 before 或用户原简历；
- JD 未提供时不能假装做过关键词匹配；
- 缺失关键词只从 targetRole 和 jobDescription 能支持的范围内提取。

## 验收
- 分数、维度、缺失词和改写建议齐全；
- 每条改写有 before 和 after；
- 不出现任何用户未提供的量化结果。
