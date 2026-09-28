/**
 * 白名单域名可达性复核
 *
 * 用法：
 *   node scripts/verify-whitelist.mjs           # 只报告
 *   node scripts/verify-whitelist.mjs --write    # 把实测结果写回 whitelist.json 的 reachability
 *
 * 背景：仓库里的 reachability 字段是 2026-09-25 首次实测结果。
 * 本机代理/网络环境可能误报 502/403，所以「unverified」不等于域名不存在，只表示需要再核一次。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'apps/web/src/lib/whitelist.json');
const entries = JSON.parse(readFileSync(file, 'utf8'));
const write = process.argv.includes('--write');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

let changed = 0;
for (const entry of entries) {
  let status = 'FAIL';
  for (const scheme of ['https', 'http']) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(`${scheme}://${entry.domain}`, {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timer);
      status = String(res.status);
      break;
    } catch {
      status = 'FAIL';
    }
  }

  const reachable = status.startsWith('2') || status === '403' || status === '412';
  if (write && reachable && entry.reachability !== 'verified') {
    entry.reachability = 'verified';
    changed += 1;
  } else if (write && !reachable && entry.reachability === 'verified') {
    entry.reachability = 'unverified';
    changed += 1;
  }
  console.log(`${reachable ? 'OK  ' : 'MISS'} ${status.padEnd(5)} ${entry.domain}  ${entry.name}`);
}

if (write) {
  writeFileSync(file, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`\n已写回 whitelist.json，更新 ${changed} 条。`);
} else {
  console.log('\n（加 --write 可把实测结果写回 whitelist.json）');
}
