# 岗位来源与复核记录

核验基准日期：2026-10-12（Asia/Shanghai）  
数据主表：outputs-repo-parity/05-active-jobs.csv

## 核验规则

每条岗位以独立详情页为准，检查链接可访问、正文和 CSV 摘录一致、仍有在招或有效期证据。无明确截止日期时，核验后最多 7 天；截止日在 7 天内时标记 verified_closing_soon 并按截止日复核。页面关闭、到期或正文发生实质变化后，不得保留为普通有效岗位。

## 逐条复核结果

| 岗位 | 来源与页面证据 | quote 核对 | 状态 / 日期 |
|---|---|---|---|
| 上海人工智能实验室 · 科学数据治理实习生 | [企业官网详情](https://www.shlab.org.cn/joinus/detail/7686361384142162212?mode=campus&subject=7538649065812363566)；10 月 9 日复核，正文可读且页面有投递入口。 | 专业、学历、半年实习和每周至少 4 天与 CSV 摘录一致。 | verified_active；核验 10-09，复核 10-16。 |
| 中国移动 · 大数据工程师-杭州 | [中国移动官方详情](https://job.10086.cn/touch/personal/job/detail.html?id=fb57da22-7f4b-4716-834d-77e926dc6fd9&typess=1)；10 月 12 日经 Edge 打开，原链接跳转至官网职位详情。页面仍可访问，正文含岗位信息和明确截止日 2026-10-11；未显示延期信息或当前可投递状态。 | 届别、本科及以上、专业范围与 CSV quote 一致。 | verified_expired / expired；核验日 2026-10-12；截止日已过，不再列作有效岗位。 |
| 信也科技 · 商业分析师 | [四川大学就业详情](https://jy.scu.edu.cn/index/index/employjobdetail.html?data=MDAwMDAwMDAwMJG6n3_Ed6imi4qQtLh4Y5WKzrbSsnbddricp9CWi5qikaeWacSdqLqGfaK2w4iil5C4zNbGiL-E)；10 月 10 日可访问，详情页有效至 2026-11-29，含网申入口。 | 本科、专业不限、毕业窗口与摘录一致。地点取正文所列上海/深圳/非洲；结构化地址另标“全国”，投递前以网申城市选项核实。 | verified_active；核验 10-10，复核 10-17。 |
| 崇劲（杭州）科技 · 数据分析 | [中国计量大学智慧就业详情](https://jyb.cjlu.edu.cn/job/view/id/429236)；10 月 10 日可访问，仍有投递入口，未标明确截止。 | 岗位标题、地点和本科专业列表与摘录一致。 | verified_active；核验 10-10，复核 10-17。 |
| 中控技术 · 数据运营实习生 | [应届生求职网转载页](https://m.yingjiesheng.com/job-008-087-707.html)；10 月 9 日原页正文可读；另在[智联同岗页](https://www.zhaopin.com/jobdetail/CC191024010J40846284916.htm)交叉核对已审核和可投递信号。 | 学历、专业优先项和实习时长与 CSV quote 一致。 | verified_active；核验 10-09，复核 10-16；原来源继续标 C。 |

## 字段说明和证据边界

- 信也科技 CSV 的 location 为“上海/深圳/非洲”，对应四川大学详情正文的工作地点；结构化地址字段另写“全国”，投递前应以网申城市选项为准。截止日为 2026-11-29，CSV、展示页和 PDF 使用同一日期。
- 中国移动在 2026-10-12 再次打开官方详情页：原链接可访问、岗位正文仍在，明确截止日为 2026-10-11，页面未显示延期信息或当前可投递状态。按截止日期标记 verified_expired / expired；10 月 11 日当天仍显示投递入口的记录只证明截止日当天的状态，不延伸到截止日之后。
- 中控技术可信度仍为 C；交叉来源只补充状态信号，不能把转载源说成企业官网。
- 五条岗位 friendlyLevel 均为 unverified；不把本科门槛转述为双非友好。
- 页面、资格、截止日期或岗位状态没有证据时不补造。中国移动当日页面截图和新分享页截图保存在 output/contest/evidence/。
