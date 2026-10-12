/**
 * 信息中枢 · 岗位字段补全脚本（不消耗博查额度）
 *
 * 背景：采集阶段只存了「标题 + 原文证据 + 链接」，薪资/地点/学历/要求/截止 都是空的（0%）。
 * 本脚本直接抓取这些已知 URL（**不调用博查，零 API 成本**），从页面里解析结构化字段。
 *
 * 原则：解析不出来就保持原样，绝不猜测、绝不编造。
 *
 * 用法：
 *   node scripts/enrich-jobs.mjs              # 只报告，不写回
 *   node scripts/enrich-jobs.mjs --write      # 写回 hub-seed.json
 *   node scripts/enrich-jobs.mjs --write --limit 20
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedFile = join(root, 'apps/web/src/lib/hub-seed.json');
const args = process.argv.slice(2);
const write = args.includes('--write');
const limitArg = Number(args[args.indexOf('--limit') + 1]);
const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : Infinity;

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
};

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

/**
 * 高校就业网的标准版式（多所学校共用同一套系统）：
 *   {岗位名} {薪资} | {地点} | {类型} | {学历}  已过期 {YYYY-MM-DD}发布
 * 解析不出来就返回空补丁。
 */
/** 主要城市名单：只用于「从工作地址/标题里取城市」，不做其他推断 */
const CITIES = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '杭州',
  '南京',
  '苏州',
  '成都',
  '重庆',
  '武汉',
  '西安',
  '天津',
  '长沙',
  '合肥',
  '郑州',
  '青岛',
  '厦门',
  '福州',
  '南昌',
  '无锡',
  '宁波',
  '佛山',
  '东莞',
  '昆明',
  '贵阳',
  '南宁',
  '太原',
  '石家庄',
  '沈阳',
  '大连',
  '哈尔滨',
  '长春',
  '兰州',
  '呼和浩特',
  '海口',
  '珠海',
  '中山',
  '惠州',
  '泉州',
  '温州',
  '绍兴',
  '嘉兴',
  '常州',
  '南通',
  '徐州',
  '扬州',
  '芜湖',
  '洛阳',
  '烟台',
  '潍坊',
  '保定',
  '唐山',
  '包头',
  '济南',
  '乌鲁木齐',
  '银川',
  '西宁',
  '拉萨',
  '三亚',
];

function firstCity(text) {
  const hit = CITIES.find((c) => text.includes(c));
  return hit ?? '';
}

function parseFields(text) {
  const patch = {};

  const head = text.match(
    /(\d{3,6}\s*-\s*\d{3,6}|\d+(?:\.\d+)?\s*[kK]\s*-\s*\d+(?:\.\d+)?\s*[kK]?|面议)\s*\|\s*([^|]{2,32})\|\s*([^|]{1,12})\|\s*([^|\s]{1,12})/
  );
  if (head) {
    patch.salary = head[1].replace(/\s+/g, '');
    patch.location = head[2].trim();
    patch.degree = head[4].trim();
  }

  // 薪资兜底：单独出现的「xxxx-xxxx」区间
  if (!patch.salary) {
    const s = text.match(/\b(\d{4,5}\s*-\s*\d{4,5})\b/);
    if (s) patch.salary = s[1].replace(/\s+/g, '');
  }

  // 学历兜底
  if (!patch.degree) {
    const d = text.match(
      /(博士|硕士及以上|硕士|本科及以上|本科以上|本科|大专及以上|专科及以上|不限学历|学历不限)/
    );
    if (d) patch.degree = d[1];
  }

  const major = text.match(/需求专业[:：]\s*([^职工语联点]{2,40})/);
  if (major) patch.major = major[1].trim();

  const addr = text.match(/工作地址\s*([^点]{4,60})/);
  if (addr) patch.address = addr[1].trim();

  const exp = text.match(/工作经验[:：]\s*([^语联联]{1,12})/);
  if (exp) patch.experience = exp[1].trim();

  const pub = text.match(/(\d{4}-\d{2}-\d{2})\s*发布/);
  if (pub) patch.publishedAt = pub[1];

  const deadline = text.match(
    /(?:截止|报名时间|有效期至)[^\d]{0,10}(\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2})/
  );
  if (deadline) patch.deadlineText = deadline[1];

  patch.expired = /已过期/.test(text);
  if (patch.address) patch.addressCity = firstCity(patch.address);
  // 标题里的城市：如「前端开发实习生-广州」「软件开发类(杭州、成都)」
  const titleLine = text.slice(0, 200);
  const titleCityMatch = titleLine.match(
    /[-—(（\s]([\u4e00-\u9fa5]{2,4}(?:[、,，][\u4e00-\u9fa5]{2,4})*)[)）\s]/
  );
  if (titleCityMatch) patch.titleCity = firstCity(titleCityMatch[1]);
  if (!patch.location && patch.addressCity) patch.location = patch.addressCity;

  return patch;
}

const seed = JSON.parse(readFileSync(seedFile, 'utf8'));
const targets = seed.jobs.slice(0, limit === Infinity ? seed.jobs.length : limit);

let fetched = 0;
let parsed = 0;
let expired = 0;
const byField = { salary: 0, location: 0, degree: 0, requirements: 0, deadline: 0 };
const failures = [];

for (const job of targets) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15_000);
    const res = await fetch(job.url, { headers: UA, signal: ctl.signal, redirect: 'follow' });
    clearTimeout(timer);
    fetched += 1;

    if (!res.ok) {
      failures.push(`${res.status} ${job.url}`);
      continue;
    }
    const text = clean(await res.text());
    if (text.length < 300) {
      // JS 渲染或反爬页面，正文太少，跳过而不是硬猜
      failures.push(`正文过短(${text.length}) ${job.url}`);
      continue;
    }

    const p = parseFields(text);
    let touched = false;

    if (p.salary && job.salary === '见原文') {
      job.salary = p.salary;
      byField.salary += 1;
      touched = true;
    }
    if (job.location === '见原文') {
      const loc = p.location || p.addressCity || p.titleCity || '';
      if (loc) {
        job.location = loc;
        byField.location += 1;
        touched = true;
      }
    }
    if (p.degree && !job.degree) {
      job.degree = p.degree;
      byField.degree += 1;
      touched = true;
    }

    const reqs = [];
    if (p.major && p.major !== '不限') reqs.push(`需求专业：${p.major}`);
    if (p.experience && p.experience !== '不限') reqs.push(`工作经验：${p.experience}`);
    if (reqs.length && (!job.requirements || job.requirements.length === 0)) {
      job.requirements = reqs;
      byField.requirements += 1;
      touched = true;
    }

    if (p.deadlineText) {
      job.deadline = `截止 ${p.deadlineText}`;
      byField.deadline += 1;
      touched = true;
    } else if (p.publishedAt) {
      job.deadline = `${p.publishedAt} 发布`;
      byField.deadline += 1;
      touched = true;
    }

    // 过期标记写进 tags，前端会显示出来（不隐藏，避免让用户以为还能投）
    if (p.expired) {
      expired += 1;
      if (!job.tags.includes('已过期')) job.tags.push('已过期');
      touched = true;
    }
    job.enrichedAt = new Date().toISOString();
    if (touched) parsed += 1;
  } catch (e) {
    failures.push(`${e.message} ${job.url}`);
  }
}

console.log(`扫描 ${targets.length} 条岗位，成功抓取 ${fetched} 个页面`);
console.log(`有字段被补全的岗位：${parsed} 条`);
console.log(
  `字段补全：薪资 ${byField.salary}｜地点 ${byField.location}｜学历 ${byField.degree}｜要求 ${byField.requirements}｜时间 ${byField.deadline}`
);
console.log(`标记已过期：${expired} 条`);
console.log(`抓取失败/跳过：${failures.length} 条（多为 JS 渲染页面，保持原样不猜测）`);
failures.slice(0, 5).forEach((f) => console.log('  · ' + f));

if (write) {
  seed._meta.enrichedAt = new Date().toISOString();
  seed._meta.jobFieldFillRate = {
    salary: byField.salary,
    location: byField.location,
    degree: byField.degree,
    requirements: byField.requirements,
    deadline: byField.deadline,
    expired,
    total: seed.jobs.length,
  };
  writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n', 'utf8');
  console.log('\n已写回 hub-seed.json');
} else {
  console.log('\n（加 --write 才会写回）');
}
