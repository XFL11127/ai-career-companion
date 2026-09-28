/**
 * 信息中枢 · 证据与机会采集脚本
 *
 * 用法：
 *   node scripts/harvest-evidence.mjs "检索词1" "检索词2"
 *   node scripts/harvest-evidence.mjs --deep "…"        # 再抓原文页面，摘句更准
 *   node scripts/harvest-evidence.mjs --merge "…"       # 合并进 apps/web/src/lib/hub-seed.json
 *   node scripts/harvest-evidence.mjs --push "…"        # 推送到 Supabase evidence_items
 *
 * 设计原则：
 *   1. 摘不到原文句子的结果直接丢弃，不产出「无证据」条目；
 *   2. 非白名单域名一律不产出证据；
 *   3. 只有「official 白名单 + 强信号 + 正向」自动置 approved，其余 pending 等人审；
 *   4. 真正的展示门禁在 packages/types 的 deriveFriendlyLevel()，脚本不能绕过它。
 *   5. 只有「招聘类公告」才会额外生成岗位条目，避免把政策文件塞进岗位库。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 自动读取 apps/web/.env.local，省去每次手工 export */
function loadEnvLocal() {
  const file = join(root, 'apps/web/.env.local');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const whitelistData = JSON.parse(
  readFileSync(join(root, 'apps/web/src/lib/whitelist.json'), 'utf8')
);
const whitelist = whitelistData.entries;
const whitelistPatterns = whitelistData.patterns ?? [];

const args = process.argv.slice(2);
const deep = args.includes('--deep');
const push = args.includes('--push');
const merge = args.includes('--merge');
const usePreset = args.includes('--preset');
const queries = args.filter((a) => !a.startsWith('--'));

// --preset：读取 scripts/harvest-preset.txt 里的检索词（窄切口批量采集）
if (usePreset) {
  const idx = args.indexOf('--preset-file');
  const presetFile =
    idx >= 0 && args[idx + 1] ? args[idx + 1] : join(root, 'scripts/harvest-preset.txt');
  if (!existsSync(presetFile)) {
    console.error('找不到 scripts/harvest-preset.txt');
    process.exit(1);
  }
  const preset = readFileSync(presetFile, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  queries.push(...preset);
  console.log('预设检索词 ' + preset.length + ' 条');
}

if (queries.length === 0 && !usePreset) {
  console.error(
    '请至少给一个检索词，例如：node scripts/harvest-evidence.mjs "杭州 前端 实习 招聘公告 本科及以上"'
  );
  process.exit(1);
}

const apiKey = process.env.BOCHA_API_KEY ?? process.env.HUB_SEARCH_API_KEY ?? '';
if (!apiKey) {
  console.error('缺少 BOCHA_API_KEY：请写入 apps/web/.env.local 或设置环境变量。');
  process.exit(1);
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const STRONG = [
  { signal: 'policy', re: /(?:严禁|不得|禁止)[^。；！？!?\n]{0,40}(?:学历|院校|985|211|第一学历)/ },
  {
    signal: 'school_list',
    re: /不限(?:毕业)?院校|院校不限|不限定院校|无院校限制|不限学校|面向全国高校/,
  },
  { signal: 'bonus', re: /不限专业|专业不限|不限学历|学历不限|不卡学历|能力优先|项目经历优先/ },
  {
    signal: 'historical_admit',
    re: /(?:拟录用|录取|录用)[^。；！？!?\n]{0,8}(?:人员)?(?:名单|公示)|生源院校/,
  },
];
const WEAK = [
  { signal: 'degree_barrier', re: /本科及以上|本科以上|全日制本科|统招本科|专科及以上/ },
];
const NEGATIVE = [
  { signal: 'school_list', re: /(?:仅限|只招|限)[^。；！？!?\n]{0,12}(?:985|211|双一流)|第一学历/ },
];

function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function whitelistEntryFor(url) {
  const host = hostnameOf(url);
  if (!host) return null;

  // 1) 显式名单（子域优先）
  const explicit = whitelist
    .filter((e) => host === e.domain.toLowerCase() || host.endsWith('.' + e.domain.toLowerCase()))
    .sort((a, b) => b.domain.length - a.domain.length)[0];
  if (explicit) return explicit;

  // 2) 域名空间规则：gov.cn 全站；edu.cn 的 job./career./jyb./jy. 等就业子站
  for (const pattern of whitelistPatterns) {
    if (!(host === pattern.suffix || host.endsWith('.' + pattern.suffix))) continue;
    if (pattern.labels) {
      const firstLabel = host.split('.')[0];
      if (!pattern.labels.includes(firstLabel)) continue;
    }
    return { domain: host, name: pattern.name, tier: pattern.tier, category: pattern.category };
  }
  return null;
}

function clean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceAt(text, index) {
  const start = Math.max(
    0,
    ...['。', '；', '！', '？', '!', '?', '\n'].map((c) => text.lastIndexOf(c, index) + 1)
  );
  const ends = ['。', '；', '！', '？', '!', '?', '\n']
    .map((c) => text.indexOf(c, index))
    .filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  const quote = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return quote.length > 220 ? quote.slice(0, 220) + '…' : quote;
}

function extract(text) {
  const out = [];
  const seenQuotes = new Set();
  const push = (signal, direction, strong, m) => {
    if (!m) return;
    const quote = sentenceAt(text, m.index);
    if (quote.length < 12) return;
    const key = signal + '|' + quote.slice(0, 40);
    if (seenQuotes.has(key)) return;
    seenQuotes.add(key);
    out.push({ signal, direction, strong, quote });
  };
  for (const rule of NEGATIVE) push(rule.signal, 'negative', false, rule.re.exec(text));
  for (const rule of STRONG) push(rule.signal, 'positive', true, rule.re.exec(text));
  for (const rule of WEAK) push(rule.signal, 'positive', false, rule.re.exec(text));
  return out;
}

const stripTags = clean;

async function searchBocha(query) {
  try {
    const res = await fetch(
      process.env.HUB_SEARCH_ENDPOINT ?? 'https://api.bochaai.com/v1/web-search',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          // 时效：默认只取一年内，避免把 2023 年的旧公告当成在招岗位
          // 可选 noLimit / oneDay / oneWeek / oneMonth / oneYear
          freshness: process.env.HUB_SEARCH_FRESHNESS ?? 'oneYear',
          summary: true,
          count: 20,
        }),
      }
    );
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 160);
      console.warn('博查检索失败 ' + res.status + '：' + query + ' → ' + detail);
      if (res.status === 401) {
        console.error('BOCHA_API_KEY 无效（401）。请检查 apps/web/.env.local。');
      } else if (res.status === 403) {
        console.error('博查账号额度不足（403）。请到 open.bochaai.com 领取免费额度或充值后重试。');
      }
      return [];
    }
    const payload = await res.json();
    return payload?.data?.webPages?.value ?? payload?.webPages?.value ?? [];
  } catch (error) {
    console.warn('检索请求异常（已跳过该检索词）：' + query + ' → ' + (error?.message ?? error));
    return [];
  }
}
async function pageText(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return '';
    return clean(await res.text()).slice(0, 40_000);
  } catch {
    return '';
  }
}

/** 从公告标题里猜机构名；猜不出就用站点名，绝不编造 */
function guessCompany(title, siteName, extraText) {
  // 先剥掉【2026校园招聘】这类前缀和中括号内容，避免把年份当公司名
  const cleaned = String(title || '')
    .replace(/【[^】]*】/g, ' ')
    .replace(/^[\s\-—·:：]*/, '')
    .replace(/^关于/, '')
    .replace(/[\s]*的?(招聘|校招)?公告[\s]*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 形如「杭州海康威视数字技术股份有限公司招聘…」→ 取「招聘/校招」之前的部分
  const m = cleaned.match(
    /([\u4e00-\u9fa5A-Za-z0-9（）()·\-.]{2,30}?)(?:\d{4}年?)?(?:届)?(?:校园|社会|春季|秋季|校招|招聘|招募)/
  );
  const candidate = m?.[1]?.replace(/[（(].*$/, '').trim() ?? '';
  // 至少含两个汉字，且不能是纯年份/纯数字
  if (
    candidate &&
    (candidate.match(/[\u4e00-\u9fa5]/g) ?? []).length >= 2 &&
    !/^[0-9\s]+$/.test(candidate)
  ) {
    return candidate.replace(/^(?:发布于|来源[:：]?)/, '').trim();
  }

  // 退一步：标题里出现「-公司名」时取连字符后的公司
  const dash = cleaned.match(/[-—]\s*([\u4e00-\u9fa5]{2,30}(?:公司|集团|银行|研究院|事业部|中心))/);
  if (dash?.[1]) return dash[1].trim();

  // 再从职位正文里找企业全称（JD 正文常直接写「XX有限公司」）
  const corp = String(extraText || '').match(
    /[\u4e00-\u9fa5]{2,20}(?:股份有限公司|有限责任公司|有限公司|集团|银行|研究院|研究所|设计院)/
  );
  if (corp?.[0]) return corp[0].replace(/^(?:发布于|来源[:：]?)/, '').trim();

  return siteName || '见公告原文';
}

/** 公司名是否为兜底值（没能从标题里解析出真实企业名） */
function isFallbackCompany(name) {
  return !/[\u4e00-\u9fa5]{2,}?(公司|集团|银行|研究院|研究所|大学|学院|中心|局|厂|事业部|科技|电子|软件)/.test(
    String(name || '')
  );
}

/** 列表页 / 过滤页 / 空标题——这些不是具体岗位，不能进岗位库 */
const JUNK_TITLE =
  /职位.{0,3}公司对比|招聘信息\s*-|招聘求职信息|^[\u4e00-\u9fa5]{2,4}$|搜索|筛选|首页/;

const RECRUIT_HINT = /招聘|校招|实习|招募|宣讲|职位|岗位|春招|秋招|补录/;

const candidates = [];
const jobs = [];
const seen = new Set();
const seenQuotes = new Set();
const jobIndexByQuote = new Map();
const jobIndexByCompany = new Set();
const jobUrls = new Set();

for (const query of queries) {
  const items = await searchBocha(query);
  console.log(`「${query}」返回 ${items.length} 条`);
  for (const item of items) {
    const url = String(item.url ?? '');
    const entry = whitelistEntryFor(url);
    if (!entry) continue;

    const title = stripTags(item.name || item.siteName || '');
    const snippet = stripTags(item.summary || item.snippet || '');
    let text = `${title} ${snippet}`;
    if (deep) {
      const full = await pageText(url);
      if (full) text = `${text} ${full}`;
    }

    const hits = extract(text);
    if (hits.length === 0) continue;

    const credibility = entry.tier === 'official' ? 'A' : 'B';
    const pageEvidence = [];

    for (const hit of hits) {
      const key = `${url}|${hit.signal}|${hit.quote}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // 同一份 JD 被多所学校转载时，只保留一条证据（避免 100 条里 80 条是重复岗位）
      const quoteKey = hit.quote.replace(/[\s，。、；：（）()【】「」《》""'']/g, '').slice(0, 60);
      if (seenQuotes.has(quoteKey)) continue;
      seenQuotes.add(quoteKey);
      // 官方来源 + 正向 + 非「时间窗口」→ 自动通过。
      // 注意：通过 ≠ 双非友好；标签强度仍由 deriveFriendlyLevel 按信号分级
      // （degree_barrier 只会显示「门槛可及」，强信号才显示「双非友好 · 有据」）。
      // 限制性表述（negative）保持待审核，避免误报风险提示。
      const autoApprove =
        credibility === 'A' && hit.direction === 'positive' && hit.signal !== 'deadline';
      const evidence = {
        id: `ev_${Date.now().toString(36)}_${candidates.length}`,
        company: guessCompany(title, entry.name, snippet + ' ' + text.slice(0, 2000)),
        role: title.slice(0, 120),
        signal: hit.signal,
        direction: hit.direction,
        quote: hit.quote,
        sourceUrl: url,
        sourceSite: hostnameOf(url),
        publishedAt: item.datePublished ?? item.dateLastCrawled ?? undefined,
        fetchedAt: new Date().toISOString(),
        credibility,
        reviewer: autoApprove ? 'auto:whitelist' : undefined,
        status: autoApprove ? 'approved' : 'pending',
      };
      candidates.push(evidence);
      pageEvidence.push(evidence);
    }

    // 只把「招聘类公告」做成岗位条目；政策文件留在证据库
    const looksLikeJob = RECRUIT_HINT.test(title) || RECRUIT_HINT.test(snippet);
    const jobKey = (pageEvidence[0]?.quote ?? '')
      .replace(/[\s，。、；：（）()【】「」《》""'']/g, '')
      .slice(0, 60);
    const company = guessCompany(title, entry.name, snippet + ' ' + text.slice(0, 2000));
    // 岗位库准入三条硬规则：
    //   1) 只收官方来源（高校就业网 / 政府 / 企业官方校招站）——平台的列表页不是岗位；
    //   2) 必须能解析出真实企业名——「某平台」不是雇主；
    //   3) 标题不能是列表页/过滤页。
    const jobEligible =
      looksLikeJob &&
      pageEvidence.length > 0 &&
      credibility === 'A' &&
      !isFallbackCompany(company) &&
      !JUNK_TITLE.test(title);

    const job = jobEligible
      ? {
          id: `job_${hostnameOf(url).replace(/\./g, '_')}_${jobs.length}`,
          company,
          role: title.slice(0, 120),
          salary: '见原文',
          location: '见原文',
          industry: '',
          degree: '',
          tags: ['招聘公告', credibility === 'A' ? '官方来源' : '权威来源'],
          url,
          description: snippet.slice(0, 300) || '见公告原文',
          requirements: [],
          deadline: '',
          evidence: pageEvidence,
        }
      : null;

    if (job && !jobUrls.has(url)) {
      jobUrls.add(url);
      const companyKey = (
        company +
        '|' +
        title.replace(/【[^】]*】/g, '').replace(/[\s\-—]/g, '')
      ).slice(0, 60);
      if (jobIndexByCompany.has(companyKey)) {
        jobUrls.add(url);
      } else {
        jobIndexByCompany.add(companyKey);
        const existingIdx = jobIndexByQuote.get(jobKey);
        if (existingIdx === undefined) {
          jobIndexByQuote.set(jobKey, jobs.length);
          jobs.push(job);
        } else if (
          isFallbackCompany(jobs[existingIdx].company) &&
          !isFallbackCompany(job.company)
        ) {
          // 同一岗位被多所学校转载：保留能解析出真实公司名的那条
          jobs[existingIdx] = job;
        }
      }
    }
  }
}

const approved = candidates.filter((c) => c.status === 'approved').length;
mkdirSync(join(root, 'data'), { recursive: true });
const outFile = join(root, 'data', `hub-harvest-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(
  outFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      queries,
      deep,
      summary: {
        evidence: candidates.length,
        approved,
        pending: candidates.length - approved,
        jobs: jobs.length,
      },
      evidence: candidates,
      jobs,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(
  `\n证据 ${candidates.length} 条（自动通过 ${approved} / 待审核 ${candidates.length - approved}）｜岗位/公告 ${jobs.length} 条`
);
console.log(`已写入 ${outFile}`);

if (merge || push) {
  const seedFile = join(root, 'apps/web/src/lib/hub-seed.json');
  const seed = JSON.parse(readFileSync(seedFile, 'utf8'));

  if (merge) {
    const norm = (q) => q.replace(/[\s，。、；：（）()「」《》“”'']/g, '').slice(0, 50);
    const haveUrl = new Set(seed.evidence.map((e) => e.sourceUrl));
    const haveQuote = new Set(seed.evidence.map((e) => norm(e.quote)));
    let addedEv = 0;
    for (const e of candidates) {
      if (haveUrl.has(e.sourceUrl) && haveQuote.has(norm(e.quote))) continue;
      if (haveQuote.has(norm(e.quote))) continue;
      haveUrl.add(e.sourceUrl);
      haveQuote.add(norm(e.quote));
      seed.evidence.push(e);
      addedEv += 1;
    }
    const haveJobUrl = new Set(seed.jobs.map((j) => j.url));
    let addedJob = 0;
    for (const j of jobs) {
      if (haveJobUrl.has(j.url)) continue;
      haveJobUrl.add(j.url);
      seed.jobs.push(j);
      addedJob += 1;
    }
    seed._meta.updatedAt = new Date().toISOString().slice(0, 10);
    seed._meta.verifiedCount = seed.evidence.filter((e) => e.status === 'approved').length;
    seed._meta.jobCount = seed.jobs.length;
    writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n', 'utf8');
    console.log(
      `已合并进 hub-seed.json：证据 +${addedEv}（共 ${seed.evidence.length}）｜岗位 +${addedJob}（共 ${seed.jobs.length}）`
    );
  }

  if (push) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    if (!url || !key) {
      console.error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY，未推送。');
      process.exit(1);
    }
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/evidence_items`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(candidates),
    });
    console.log(
      res.ok
        ? `已推送 ${candidates.length} 条证据到 Supabase`
        : `推送失败 ${res.status}：${await res.text()}`
    );
  }
}
