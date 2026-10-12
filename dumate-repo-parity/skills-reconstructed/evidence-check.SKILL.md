---
name: evidence-check
description: 仓库 info 能力中的证据与岗位核验层。只输出来源明确、可点击核对、带原文摘录的岗位；没有证据时返回空结果。用户查看岗位、信息差、政策依据或询问机会是否真实时触发。
---

# evidence-check · 信息核验

## 用途
实现仓库 info 的硬性证据规则。模型不得自行给岗位打“双非友好”标签，友好等级由系统根据证据计算。

## 输入
- 用户查询、目标岗位、城市或行业；
- context：会话记忆，可选；
- profile：用户画像，可选。

## 输出
- reply：对检索结果和证据缺口的说明；
- jobs：岗位数组，可为空。

每个 job 字段：
- company
- role
- salary
- location
- tags
- url
- sourceSite
- publishedAt
- evidenceQuote
- signal

## 硬性规则
- company、role、url 必须来自真实公告，禁止“某公司”“某电商平台”等占位名；
- evidenceQuote 必须逐字来自 url 页面；
- 没有 evidenceQuote、url 不是独立详情页、来源是搜索页/列表页/首页时，该条不得输出；
- 禁止编造 url、岗位、薪资、日期或录用条件；
- 不得自行输出“双非友好”布尔标签；
- 只有“本科及以上”不能推断双非友好；
- 没有真实信息时 jobs 返回空数组，并说明先去信息中枢检索或补充来源；
- active-job-verifier 是下游能力，用来进一步判断有效期和投递条件。

## 验收标准
- 返回的每条岗位都有独立 url 和 evidenceQuote；
- 无证据时不返回占位岗位；
- 输出可直接进入 active-job-verifier 和 plan。
