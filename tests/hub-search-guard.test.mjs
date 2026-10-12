import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * 成本护栏回归测试
 *
 * 背景：/api/hub/search 是唯一会按次扣博查余额的用户入口。
 * 这三条断言保证「缓存不扣额度、超限被拦、可一键关闭」不会被后续改动破坏。
 */

let guard = null;
let importError = '';
try {
  guard = await import(new URL('../apps/web/src/lib/hub-search-guard.ts', import.meta.url).href);
} catch (error) {
  importError = error instanceof Error ? error.message : String(error);
}

const skip = guard ? false : `无法加载 TS 模块（${importError}）`;

test('护栏模式：默认 limited，可被环境变量覆盖为 off / unlimited', { skip }, () => {
  delete process.env.HUB_USER_SEARCH;
  assert.equal(guard.userSearchMode(), 'limited', '默认必须是 limited，不能是不限次');

  process.env.HUB_USER_SEARCH = 'off';
  assert.equal(guard.userSearchMode(), 'off');

  process.env.HUB_USER_SEARCH = 'unlimited';
  assert.equal(guard.userSearchMode(), 'unlimited');

  process.env.HUB_USER_SEARCH = '乱填的值';
  assert.equal(guard.userSearchMode(), 'limited', '非法值必须回落到 limited');

  delete process.env.HUB_USER_SEARCH;
});

test('护栏 1：缓存命中不产生新调用', { skip }, () => {
  const outcome = { ok: true, query: '缓存测试', results: [], whitelistedCount: 0 };
  assert.equal(guard.readSearchCache('  缓存测试 '), null, '未写入时应为 null');

  guard.writeSearchCache('缓存测试', outcome);
  const hit = guard.readSearchCache('  缓存测试');
  assert.ok(hit, '写入后应能命中（且忽略首尾空格）');
  assert.equal(hit.query, '缓存测试');

  const before = guard.searchUsage().providerCalls;
  guard.recordCacheHit();
  assert.equal(guard.searchUsage().providerCalls, before, '命中缓存不得增加 providerCalls');
});

test('护栏 2：每 IP 每日配额用尽后必须拒绝', { skip }, () => {
  process.env.HUB_SEARCH_DAILY_LIMIT = '2';
  const ip = 'test-ip-quota';

  const first = guard.consumeSearchQuota(ip);
  assert.equal(first.allowed, true);
  assert.equal(first.limit, 2);
  assert.equal(first.remaining, 1);

  const second = guard.consumeSearchQuota(ip);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);

  const third = guard.consumeSearchQuota(ip);
  assert.equal(third.allowed, false, '超出每日上限必须拒绝');
  assert.equal(third.remaining, 0);

  // 不同 IP 互不影响
  const other = guard.consumeSearchQuota('test-ip-other');
  assert.equal(other.allowed, true);

  delete process.env.HUB_SEARCH_DAILY_LIMIT;
});

test('护栏 2 补充：配额为 0 时一律拒绝', { skip }, () => {
  process.env.HUB_SEARCH_DAILY_LIMIT = '0';
  const result = guard.consumeSearchQuota('test-ip-zero');
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  delete process.env.HUB_SEARCH_DAILY_LIMIT;
});
