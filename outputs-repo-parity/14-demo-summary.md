# 最终完整演示总览（第 12 步 · 汇总）

> 执行日期：2026-09-28。执行方式：严格按 `04-最终完整演示提示词.md` 12 步串行执行，只执行一轮，未自动重试、未并行生成、未做无关联网。演示学生：双非本科大三 · 信息管理与信息系统 · 目标杭州/上海数据分析或数据运营实习 · 每周 4 天 × 3 个月 · 无正式企业实习 · 2 个课程项目（量化数据未提供）。

## 一、实际调用 Skill（12 个，全部真实执行）

| # | 步骤 | Skill | 产物文件 | 状态 |
|---|---|---|---|---|
| 1 | 画像采集 | profile-intake | 01-profile-intake.md | ✅ 完成 |
| 2 | 五维破局诊断 | gap-diagnosis | 02-gap-diagnosis.md | ✅ 完成（radar 固定五维：技术栈/实习/项目/算法/信息差） |
| 3 | 信息核验 | evidence-check + active-job-verifier | 03-evidence-job-verification.md、04-rejected-jobs.csv、05-active-jobs.csv | ✅ 完成（2 次搜索 + 2 处详情页核验） |
| 4 | 三阶段规划 | career-plan-306090 | 06-career-plan-306090.md | ✅ 完成（0-30/31-60/61-90，type 覆盖 study/project/apply/review） |
| 5 | 项目深挖练习 | practice | 07-practice.md | ✅ 完成（2 题 + 纠偏反馈） |
| 6 | 成果包装 | artifact-pack | 08-artifact-pack.md | ✅ 完成（optimizedResume + 3 bullets + interviewReview + 待确认事实清单） |
| 7 | 简历 ATS | resume | 09-resume-ats.md | ✅ 完成（overall 63 / ATS 70，量化缺失如实计分） |
| 8 | 模拟面试 | interview | 10-interview.md | ✅ 完成（4 题，含 STAR 提示；无 priorAnswers 故无 scoreCard） |
| 9 | 岗位匹配 | match | 11-match.md | ✅ 完成（五维 weight=100；recommendation=caution） |
| 10 | 学习材料 | course | 12-course-sql-window.md | ✅ 完成（摘要 + 3 抽认卡 + 2 小测） |
| 11 | 职业测评 | assessment | 13-assessment.md | ✅ 完成（示例作答；3 方向 + 2-4 周计划；含免责声明） |
| 12 | 汇总 | —（本总览） | 14-demo-summary.md | ✅ 本文件 |

- 未调用外部 LLM API（无 DEEPSEEK_API_KEY 场景未出现，本演示按 skill 工作流直接产出）；全部结论基于画像事实与已核验证据，无 stub 降级占位。

## 二、关键决策（含偏离与依据）

1. **评分尊重事实缺口**：技术栈/算法能力因画像未提供依据按保守值计分并标注（gap-diagnosis）；简历"成果量化"维度 28 分（占位符按空值计）——宁可低分不编数字（AGENTS.md 第 5 条红线）。
2. **证据门禁严格化**：第 3 步 2 次搜索命中多个候选，但仅 2 个有独立详情页可开；逐一核验后均因硬条件不匹配（上海AI实验室要求实习半年 vs 用户 3 个月；崇劲科技需求专业不含信管）进入 rejected 列表——**active-jobs.csv 推荐 0 条，如实上报不凑数**（提示词第 3 步 + active-job-verifier 契约）。
3. **「双非友好」零标注**：所有岗位 friendlyLevel=unverified；未因"本科"门槛推断任何友好等级（deriveFriendlyLevel 契约，仅 policy/院校范围等强信号可点亮）。
4. **match=caution 强制**：第 9 步唯一可选岗位为 reachable_unconfirmed（核验未通过 + 时长不匹配 + 简历量化缺失），按"证据不足必须建议 caution"输出 62 分 / caution。
5. **artifact-pack 与 resume 串联**：resume 只基于 artifact-pack v1 改写，未新增任何画像外事实；全部数字占位并列入待确认清单。
6. **assessment 输出数量以提示词为准**：skill 默认 5-10 方向，提示词第 11 步要求 3 个职业方向，按提示词执行 3 个。

## 三、证据统计

| 证据类型 | 数量 | 状态 |
|---|---|---|
| 官方政策证据（复用历史） | 2 条 | ✅ 教育部 2026-07-06 就业服务政策（A）、人社部 2021-11-03 事业单位招聘不限院校规定（A）——均为官方原文，可点击核对 |
| 本轮联网搜索 | 2 次 | ✅ 杭州数据分析实习、上海数据运营实习（已达提示词上限） |
| 独立详情页核验 | 2 处 | ✅ 上海人工智能实验室（官方招聘页）、崇劲科技（高校就业网） |
| 推荐岗位（verified_active / closing_soon） | 0 条 | ⚠️ 如实上报；无满足全部条件（数据方向实习+杭沪+信管专业+3个月+详情页+有效期）岗位 |
| 排除岗位 | 4 条 | ✅ 均附排除原因（时长不匹配/专业不符/全职非实习/毕业窗口不符） |
| 双非友好标注 | 0 处 | ✅ 全部 unverified，标签门禁零违规 |
| 新增量化数字 | 0 个 | ✅ 全部占位符 + 待确认清单；未编造任何数字 |

## 四、输出文件（13 个，位于 `D:\ai-career-companion\outputs-repo-parity\`，未覆盖任何已有文件）

1. 01-profile-intake.md —— 学生画像（缺失项逐条列出）
2. 02-gap-diagnosis.md —— 五维诊断 + 3 岗位方向
3. 03-evidence-job-verification.md —— 信息核验过程与结论
4. 04-rejected-jobs.csv —— 排除岗位 4 条（含原因）
5. 05-active-jobs.csv —— 推荐岗位 0 条（空表头，如实保留）
6. 06-career-plan-306090.md —— 三阶段计划（9 个 action）
7. 07-practice.md —— 项目面试 2 题 + 纠偏
8. 08-artifact-pack.md —— 简历包装 + 待确认事实 6 项
9. 09-resume-ats.md —— ATS 评分 + 改写 3 条
10. 10-interview.md —— 模拟面试 4 题
11. 11-match.md —— 五维匹配（caution）
12. 12-course-sql-window.md —— SQL 窗口函数学习材料
13. 13-assessment.md —— 职业测评（示例作答）
14. 14-demo-summary.md —— 本汇总

## 五、剩余风险与未决项

| 风险/缺口 | 影响 | 建议动作 |
|---|---|---|
| 项目量化数据全部缺失（数据量/结论/工具链） | 简历、面试、匹配三个环节的分数被压制；包装稿不能对外投递 | 先执行 plan a1/a2 补齐真实数字（另见 artifact-pack 待确认清单 6 项） |
| 无毕业时间、联系方式等基本信息 | 画像不完整，投递无法落地 | 学生补充后更新 profile-intake |
| 推荐岗位为 0，学生无现成可投目标 | 3 个月窗口可能被浪费 | 按 plan a3/b1 流程自行筛选投递；或配置岗位检索数据源后重跑 evidence 链路 |
| 上海AI实验室时长不匹配（半年 vs 3 个月） | 唯一高匹配岗位不可投 | 与招聘方确认时长弹性；不可则放弃，改投 3 个月可接受岗位 |
| Python/Pandas 熟练度未验证；SQL 未实测 | 技能栏与 bullets 存在虚高风险 | 未验证前不写"熟练"；完成题目后再更新 resume |
| 无 JD 输入 | resume 关键词匹配与 match 均受限于画像范围 | 拿到目标岗位 JD 后重跑 resume 与 match |

## 六、分享链接状态

- **未生成任何分享链接**：本轮为本地演示，产物仅落盘至输出目录，未调用分享能力，未对外发布；如需分享请将 `outputs-repo-parity/` 内文件打包后自行决定分发渠道。

---
*本演示严格遵循 AGENTS.md 契约：只执行完成任务所必需的能力、不机械重复、信息结论有源可查、不伪造"双非友好"标签、不编造经历数字。*