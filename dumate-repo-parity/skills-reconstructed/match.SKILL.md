---
name: match
description: 仓库 match 能力的 DuMate 实现。对简历和具体 JD 做技能、经验、地域、行业、职业轨迹五维匹配评分。用户问“这个岗位适合我吗”“匹配度多少”时触发。
---

# match · 岗位匹配雷达

## 输入
- resumeText：必填
- jobDescription：必填
- targetLocation、targetIndustry、careerGoal：可选
- context、profile

## 输出
- reply
- overallScore：0-100
- recommendation：recommend / caution / avoid
- summary
- dimensions：固定五维 skills、experience、location、industry、trajectory，每项 score、weight、reason
- strengths
- missingKeywords
- risks
- actions

## 规则
- 五维权重合计 100；
- 信息不足时必须建议 caution，不得给虚假高匹配；
- 不得编造简历或 JD 内容；
- 输出具体差距和下一步行动。

## 验收
- 五个维度齐全且 weight 合计 100；
- recommendation 与总分和风险一致；
- 每条风险都有对应行动。
