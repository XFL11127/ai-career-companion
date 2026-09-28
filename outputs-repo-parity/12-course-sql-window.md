# SQL 窗口函数基础 · 学习材料（course 输出）

> 资料：SQL窗口函数基础（示例资料，beginner 水平）。目标：支撑杭州/上海数据分析实习面试高频题。严格基于资料生成；资料未展开处已标注。

## 学习引导（reply）

窗口函数是数据分析实习面试的送分题，也是最容易和白板卡壳的地方。核心就一句话：它不折叠行。先看懂"与 GROUP BY 的区别"，再看 3 个函数怎么用，最后一定要手写一遍——光看永远学不会。

## 摘要（summary）

窗口函数（Window Function）是在**保留每一行原始数据**的同时，按指定分组（PARTITION BY）和排序（ORDER BY）对每组计算聚合值的 SQL 工具。它和 GROUP BY 的本质区别是：**GROUP BY 会把多行折叠成一行，窗口函数不会折叠行、每行都能看到自己所在组的聚合结果**。常用的三类：
- 排序类：ROW_NUMBER()（行号，不并列）、RANK()（并列跳号）、DENSE_RANK()（并列不跳号）；
- 聚合类：SUM() / AVG() / COUNT() OVER (...)，可用于累计求和（配合 ORDER BY）与移动平均；
- 典型面试场景：分组 TopN（ROW_NUMBER + 子查询过滤）、累计求和、移动平均。

**资料未展开**：框架（FRAME）子句的边界细节（ROWS BETWEEN ... AND ...）资料未展开，如需深入学习需补充资料。

## 概念卡（concepts）

| 术语 | 解释 | 例子 | 为什么重要 |
|---|---|---|---|
| 窗口函数 | 在保留每行的同时按分组计算聚合值；`OVER (PARTITION BY ... ORDER BY ...)` 定义窗口 | `SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date)` 给每行加上该用户到此日期的累计金额 | 数据分析里"每行都要看到组内数值"的需求（占比、累计、排名）都靠它 |
| GROUP BY 的区别 | GROUP BY 折叠行（每组一行）；窗口函数不折叠行（每行保留且带组内聚合值） | GROUP BY user_id 返回每个用户一行；window 版本每笔订单一行 + 该用户合计列 | 面试必考一句话考点；理解错误会写错 SQL |
| 排序函数三兄弟 | ROW_NUMBER = 不并列行号；RANK = 并列跳号；DENSE_RANK = 并列不跳号 | 1,2,2,4（RANK）vs 1,2,2,3（DENSE_RANK） | 分组 TopN 与"并列是否占用名额"的场景选择依据 |

## 抽认卡（flashcards · 3 张）

1. **front**：窗口函数与 GROUP BY 最核心的区别是什么？
   **back**：GROUP BY 会把多行折叠成一行；窗口函数不折叠行，每一行都保留，并同时能看到自己所在组的聚合结果。
   **tags**：基础 / 面试必考

2. **front**：ROW_NUMBER、RANK、DENSE_RANK 三者并列时结果有何不同？
   **back**：并列时 ROW_NUMBER 仍给不同行号（随机/按序分配）；RANK 相同值同号且跳号（1,2,2,4）；DENSE_RANK 相同值同号但不跳号（1,2,2,3）。
   **tags**：排序 / 高频

3. **front**：写出"每个用户按金额排序取前 2 笔订单"的 SQL 骨架（窗口函数版）。
   **back**：子查询 + ROW_NUMBER：`SELECT * FROM (SELECT order_id, user_id, amount, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) rn FROM orders) t WHERE rn <= 2;` 要点：窗口函数在 WHERE 之后执行，必须先子查询再过滤。
   **tags**：TopN / 手写

## 小测（quiz · 2 道）

1. **单选**：`SELECT user_id, SUM(amount) FROM orders GROUP BY user_id;` 与 `SELECT user_id, amount, SUM(amount) OVER (PARTITION BY user_id) FROM orders;` 的输出行数，下列说法正确的是？
   - A. 两者行数相同，都是每个用户一行
   - B. 前者每个用户一行，后者每笔订单一行（每行额外带该用户合计）✅
   - C. 两者都保留所有订单行
   - D. 无法确定
   - **answer**：B
   - **explanation**：GROUP BY 折叠行（每用户一行）；窗口函数不折叠行（每订单一行 + 聚合列），这正是二者的核心区别。

2. **简答**：用窗口函数写出"统计每个消费窗口的总金额，并计算每个窗口金额占全体金额的百分比"，说明两处关键点。
   - **answer（框架）**：`SELECT window_id, SUM(amount) AS w_total, SUM(amount) / SUM(SUM(amount)) OVER () AS pct FROM orders GROUP BY window_id;` 关键点：① 用带 OVER() 的聚合窗口函数在 GROUP BY 之后计算全体合计，分子用 SUM(amount)（已按窗口分组）；② 明白"窗口函数里的 SUM(SUM(amount)) OVER ()"先得到分组合计、再在全局窗口上求占比。
   - **explanation**：考察聚合 + 窗口函数的组合使用：占比 = 组内合计 / 全局合计（窗口函数不折叠已经在 GROUP BY 中折叠过的行）。若资料未覆盖此组合写法，标注为**资料未展开的延伸练习**。

## 学习计划（studyPlan）

- dayRange：Day 1 —— goal 建立概念框架；tasks：①读摘要+概念卡；②用例题手写 3 遍 ROW_NUMBER TopN SQL；③用抽认卡自测 3 张
- dayRange：Day 2 —— goal 掌握排序三兄弟与累计/占比；tasks：①完成 2 道小测；②分别写 RANK、DENSE_RANK 变体验证行号差异；③把第 1 步计划 a2 的 SQL 20 题中窗口函数题做掉

## 常见误区（misconceptions）

1. 以为窗口函数会把行折叠（把 OVER 当成 GROUP BY 的替代）——不折叠，这是本质区别（资料明确）。
2. 想直接 WHERE rn <= 2 过滤窗口函数结果——窗口函数在 WHERE 之后执行，必须子查询（资料明确）。
3. RANK 和 DENSE_RANK 混淆——并列是否跳号不同，选错影响 TopN 名额判断（资料明确）。
4. 以为所有场景都能用窗口函数替代 GROUP BY——二者用途不同，各有适用场景（资料未展开细节，标注）