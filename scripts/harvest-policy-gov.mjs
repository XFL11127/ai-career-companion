/**
 * 信息中枢 · 政策证据采集（免 Key，官方源）
 *
 * 数据源：国务院政策文件库公开检索接口（sousuo.www.gov.cn），只取 gov.cn 域名的政策原文。
 * 产出：data/hub-policy-<date>.json；加 --merge 会合并进 apps/web/src/lib/hub-seed.json。
 *
 * 合规：只存「标题 + 原文短摘录 + 官方链接」，不落全文；摘录上限 220 字。
 *
 * 用法：
 *   node scripts/harvest-policy-gov.mjs
 *   node scripts/harvest-policy-gov.mjs --pages 2 --merge --limit 60
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const merge = args.includes('--merge');
const pages =
  Number(args[args.indexOf('--pages') + 1]) > 0 ? Number(args[args.indexOf('--pages') + 1]) : 1;
const limit =
  Number(args[args.indexOf('--limit') + 1]) > 0 ? Number(args[args.indexOf('--limit') + 1]) : 80;

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
  Referer: 'https://sousuo.www.gov.cn/',
};

const KEYWORDS = [
  '学历歧视',
  '就业歧视',
  '平等就业',
  '毕业生就业 学历',
  '唯学历 唯名校',
  '招聘 不得 学历',
  '不限学历',
  '第一学历',
  '就业公平',
  '破除 学历 门槛',
  '公平就业',
  '就业权益',
  '反歧视',
  '招聘信息 规范',
  '校园招聘 管理',
  '就业机会 平等',
  '学历 条件 招聘',
  '能力导向',
  '唯论文 唯帽子 唯学历',
  '劳动者 平等',
  '高校毕业生 就业 歧视',
  '事业单位 招聘 学历',
];

/** 与 apps/web/src/lib/evidence.ts 的 policy 规则保持一致：只有这些模式才算强证据 */
const POLICY_PATTERNS = [
  /(?:严禁|不得|禁止)[^。；！？!?\n]{0,40}(?:学历|院校|985|211|第一学历|性别|户籍|民族)/g,
  /(?:不得设置|清理|取消|破除|纠正)[^。；！？!?\n]{0,24}(?:歧视性|限制性|不合理限制|就业歧视|唯学历|唯名校|学历门槛)/g,
  /(?:防止和纠正|坚决纠正)[^。；！？!?\n]{0,30}(?:唯分数|唯名校|唯学历|学历)/g,
  /不得将[^。；！？!?\n]{0,30}(?:毕业院校|院校|学历|学习方式|学习经历|国（境）外)[^。；！？!?\n]{0,20}(?:作为|设为|列为)[^。；！？!?\n]{0,12}(?:限制|条件|门槛)/g,
  /(?:严禁|不得|禁止)设置[^。；！？!?\n]{0,20}(?:歧视性|指向性|排他性|与岗位无关|与岗位要求无关)[^。；！？!?\n]{0,12}(?:条件|要求|条款|资格)/g,
  /(?:消除|破除|纠正|杜绝|清理|整治)[^。；！？!?\n]{0,16}(?:学历歧视|学历门槛|唯学历|唯名校|第一学历|院校歧视|就业歧视)/g,
  /不将[^。；！？!?\n]{0,30}(?:学历|毕业院校|论文|奖项|职称|头衔)[^。；！？!?\n]{0,16}(?:作为|列为)[^。；！？!?\n]{0,12}(?:限制性|硬性)?(?:条件|标准|依据)/g,
  /(?:取消|废除|打破)[^。；！？!?\n]{0,20}(?:第一学历|学历门槛|院校门槛|学历限制)/g,
];

function stripTags(value) {
  return String(value ?? '')
    .replace(/<em>|<\/em>/g, '')
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

function safeDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function sentenceAt(text, index) {
  const starts = ['。', '；', '！', '？', '!', '?', '\n'].map(
    (c) => text.lastIndexOf(c, index) + 1
  );
  const start = Math.max(0, ...starts);
  const ends = ['。', '；', '！', '？', '!', '?', '\n']
    .map((c) => text.indexOf(c, index))
    .filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  const quote = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return quote.length > 220 ? quote.slice(0, 220) + '…' : quote;
}

/**
 * 主题相关性：政策文本里「不得设置…限制」这类表述很泛，
 * 必须同时确认这句话确实在讲就业 / 学历 / 招聘，否则会把「行政许可条件」之类误收进来。
 */
function isTopical(quote) {
  const explicit =
    /学历|院校|毕业生|招聘|求职|就业歧视|平等就业|公平就业|就业权益|劳动者平等|职业歧视/;
  return explicit.test(quote);
}

/** 近似去重：同一份文件的不同版本 / 转载常常只有细微差别 */
function quoteKey(quote) {
  return quote.replace(/[\s，。、；：（）()「」《》""'']/g, '').slice(0, 50);
}

function extractPolicyQuote(text) {
  for (const pattern of POLICY_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    const m = re.exec(text);
    if (m && m[0].length > 0) {
      const quote = sentenceAt(text, m.index);
      if (quote.length >= 12 && isTopical(quote)) return quote;
    }
  }
  return '';
}

async function searchPage(keyword, page) {
  const url =
    'https://sousuo.www.gov.cn/search-gov/data?t=zhengcelibrary_gw&q=' +
    encodeURIComponent(keyword) +
    `&p=${page}&n=10&sort=score&sortType=1&searchfield=title:content`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.searchVO?.listVO ?? [];
}

async function docText(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return '';
  return stripTags(await res.text());
}

// ---------- 采集列表 ----------
const seen = new Map();
for (const keyword of KEYWORDS) {
  for (let page = 1; page <= pages; page += 1) {
    let items = [];
    try {
      items = await searchPage(keyword, page);
    } catch (e) {
      console.warn(`检索失败「${keyword}」p${page}：${e.message}`);
      continue;
    }
    for (const item of items) {
      const url = String(item.url ?? '');
      if (!/^https:\/\/www\.gov\.cn\//i.test(url)) continue; // 只取 gov.cn 官方原文
      if (seen.has(url)) continue;
      seen.set(url, {
        title: stripTags(item.title),
        url,
        puborg: stripTags(item.puborg) || '中国政府网',
        pubtime: item.pubtimeStr || safeDate(item.pubtime),
        wenhao: stripTags(item.wenhao),
      });
    }
    process.stdout.write(`「${keyword}」p${page} 累计 ${seen.size} 条\n`);
  }
}

// ---------- 逐篇摘录 ----------
const candidates = [...seen.values()].slice(0, limit);
const evidence = [];
const seenQuotes = new Set();
let checked = 0;
for (const item of candidates) {
  checked += 1;
  try {
    const text = await docText(item.url);
    const quote = extractPolicyQuote(text);
    if (!quote) continue;
    const key = quoteKey(quote);
    if (seenQuotes.has(key)) continue;
    seenQuotes.add(key);
    evidence.push({
      id: `policy-gov-${
        item.url
          .split('/')
          .pop()
          ?.replace(/\.htm.*$/, '') ?? checked
      }`,
      company: item.puborg,
      role: `${item.title}${item.wenhao ? '（' + item.wenhao + '）' : ''}`,
      signal: 'policy',
      direction: 'positive',
      quote,
      sourceUrl: item.url,
      sourceSite: 'www.gov.cn',
      publishedAt: item.pubtime,
      fetchedAt: new Date().toISOString(),
      credibility: 'A',
      reviewer: 'auto:gov.cn-policy-library',
      status: 'approved',
    });
  } catch (e) {
    console.warn(`抓取失败 ${item.url}：${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 250)); // 对官方站点保持礼貌间隔
}

mkdirSync(join(root, 'data'), { recursive: true });
const outFile = join(root, 'data', `hub-policy-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(
  outFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'sousuo.www.gov.cn（国务院政策文件库）',
      keywords: KEYWORDS,
      scraped: seen.size,
      checked: candidates.length,
      withQuote: evidence.length,
      evidence,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(
  `\n列表去重 ${seen.size} 条 → 抓取 ${candidates.length} 篇 → 摘到政策原句 ${evidence.length} 条`
);
console.log(`已写入 ${outFile}`);

if (merge) {
  const seedFile = join(root, 'apps/web/src/lib/hub-seed.json');
  const seed = JSON.parse(readFileSync(seedFile, 'utf8'));
  const existing = new Set(seed.evidence.map((e) => e.sourceUrl));
  const added = evidence.filter((e) => !existing.has(e.sourceUrl));
  seed.evidence = [...seed.evidence, ...added];
  seed._meta.updatedAt = new Date().toISOString().slice(0, 10);
  seed._meta.verifiedCount = seed.evidence.filter((e) => e.status === 'approved').length;
  seed._meta.note =
    '信息中枢冷启动数据集：只收录带原文摘录的可核验证据，不放任何匿名占位岗位。政策类证据由 scripts/harvest-policy-gov.mjs 从国务院政策文件库采集，逐条带官方链接与原文摘句。';
  writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n', 'utf8');
  console.log(`已合并 ${added.length} 条进 hub-seed.json（现有证据 ${seed.evidence.length} 条）`);
}
