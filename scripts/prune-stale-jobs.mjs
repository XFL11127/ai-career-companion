/**
 * 信息中枢 · 清理陈旧岗位
 *
 * 岗位库只应保留「近期 + 未过期」的岗位。判断依据：
 *   - 证据发布日期（evidence.publishedAt）最新年份 < 当前年-1 → 视为陈旧；
 *   - 页面明确标注「已过期」→ 直接移除。
 *
 * 用法：
 *   node scripts/prune-stale-jobs.mjs          # 只报告
 *   node scripts/prune-stale-jobs.mjs --write  # 写回
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seedFile = join(root, 'apps/web/src/lib/hub-seed.json');
const write = process.argv.includes('--write');

const currentYear = new Date().getFullYear();
const minYear = currentYear - 1; // 允许保留上一年（跨年招聘季）

const seed = JSON.parse(readFileSync(seedFile, 'utf8'));

function newestYear(job) {
  const years = (job.evidence ?? [])
    .map((e) => Number((e.publishedAt ?? '').slice(0, 4)))
    .filter((y) => Number.isFinite(y) && y > 2000);
  return years.length ? Math.max(...years) : 0;
}

const before = seed.jobs.length;
const removed = [];
const keep = seed.jobs.filter((job) => {
  const expired = (job.tags ?? []).includes('已过期');
  const y = newestYear(job);
  if (expired) {
    removed.push(`${job.role.slice(0, 30)}（页面标注已过期）`);
    return false;
  }
  if (y && y < minYear) {
    removed.push(`${job.role.slice(0, 30)}（${y} 年公告）`);
    return false;
  }
  return true;
});

console.log(`当前年份 ${currentYear}，保留 ${minYear} 年及以后`);
console.log(`岗位：${before} → ${keep.length}（移除 ${before - keep.length} 条）`);
removed.slice(0, 8).forEach((r) => console.log('  · ' + r));

if (write && before !== keep.length) {
  seed.jobs = keep;
  seed._meta.jobCount = keep.length;
  seed._meta.prunedAt = new Date().toISOString();
  seed._meta.freshnessPolicy = `岗位库只保留证据发布时间为 ${minYear} 年及以后、且页面未标注已过期的岗位。`;
  writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n', 'utf8');
  console.log('\n已写回 hub-seed.json');
} else if (write) {
  console.log('\n没有需要移除的岗位');
}
