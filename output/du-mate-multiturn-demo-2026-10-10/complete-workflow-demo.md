# DuMate 多轮闭环运行记录

日期：2026-10-10（Asia/Shanghai）
测试画像：合成画像，用于平台流程验收，不代表真实用户。
岗位数据：以当前仓库 `outputs-repo-parity/05-active-jobs.csv` 为准。

## 本次实际执行

1. 首轮仅输入模糊的自然语言求职需求。顶层未追问画像，返回一次性回答并调用 WebSearch；因此记为路由未通过。失败这一轮没有单独截屏，不能把已有的成功流程截图说成失败路由证据。
2. 显式调用 `profile-intake` 后，智能体逐项询问年级、专业、城市、每周到岗天数、实习时长和简历情况。测试画像回答为统计学大三、杭州/上海、每周5天、计划6个月、暂无简历；SQL为基础水平，Excel会常用函数和数据透视表，Python未系统使用，无实习或比赛。
3. 实际调用顺序：`profile-intake` → `gap-diagnosis` → `evidence-check` → `active-job-verifier` → `career-plan-306090` → `practice` → `artifact-pack`。
4. `evidence-check` 在 DuMate 内置浏览器打开中国移动官方岗位详情。页面显示杭州校招全职岗、招聘17人、截止2026-10-11及简历投递入口；届别、学历、专业与 CSV 摘录一致。
5. `active-job-verifier` 标记为 `verified_closing_soon`，核验日2026-10-10，截止与下次复核日2026-10-11。测试画像的毕业届别未知，所以不判断是否满足届别资格。
6. `career-plan-306090` 输出30/60/90天行动计划。`practice` 生成一题按城市统计订单销售额的 SQL 练习；未提交答案，不记录成绩。
7. `artifact-pack` 生成 ATS 简历模板和项目展示框架；课程作业标题、数据、方法、结论保留待补。已复核并纳入本交付包，不得作为已完成的真实简历投递。

## 路由结论

七个闭环 Skill 均有真实调用记录；首轮模糊自然语言需求未自动触发画像追问，需修正顶层路由提示或入口。现有平台截图证明了完整流程的自然语言请求、路由面板和七步执行结果；首轮失败路由暂无单独截图。没有运行录屏。

## 截图索引

- `screenshots/china-mobile-official-detail-du-mate.png`：DuMate 内置浏览器中的中国移动官方详情页。
- `screenshots/active-job-verifier-result.png`：岗位核验结果。
- `../du-mate-run-2026-10-10-full-closure/screenshots/workflow-natural-language-request.jpg`：完整自然语言任务请求和 Skill 路由面板。
- `../du-mate-run-2026-10-10-full-closure/screenshots/workflow-route-top.jpg`、`workflow-route-bottom.jpg`：平台路由和七步执行结果。
- `../du-mate-run-2026-10-10-full-closure/screenshots/dumate-works-plaza-result.jpg`、`dumate-publish-result.jpg`：此前作品广场与展示页发布凭证。

本次中国移动复核仅确认2026-10-10当时页面仍开放。须在2026-10-11截止前再确认；截止后不可继续按普通有效岗位展示。
