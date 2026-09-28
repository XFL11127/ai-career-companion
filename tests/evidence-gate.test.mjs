import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function evidence(overrides = {}) {
  return {
    id: 'ev1',
    company: '示例单位',
    role: '示例岗位',
    signal: 'policy',
    direction: 'positive',
    quote: '这是一句足够长的可核对原文摘录内容',
    sourceUrl: 'https://www.gov.cn/zhengce/example.htm',
    sourceSite: 'gov.cn',
    fetchedAt: '2026-09-25T00:00:00.000Z',
    credibility: 'A',
    status: 'approved',
    ...overrides,
  };
}

let types = null;
let importError = '';
try {
  types = await import(new URL('../packages/types/index.ts', import.meta.url).href);
} catch (error) {
  importError = error instanceof Error ? error.message : String(error);
}

test(
  '标签门禁：只有「已通过 + 强信号 + 正向 + 有原句 + 有链接」才算双非友好',
  { skip: types ? false : `无法加载 TS 契约（${importError}）` },
  () => {
    const { deriveFriendlyLevel } = types;

    assert.equal(deriveFriendlyLevel([evidence()]), 'verified', '强信号 + 已通过应为 verified');
    assert.equal(
      deriveFriendlyLevel([
        evidence({ signal: 'degree_barrier', quote: '本科及以上学历即可报名应聘该岗位' }),
      ]),
      'reachable',
      '仅有学历门槛证据只能算「门槛可及」，不能断言双非友好'
    );
    assert.equal(
      deriveFriendlyLevel([
        evidence({ direction: 'negative', quote: '仅限985高校应届毕业生报考本岗位' }),
      ]),
      'unverified',
      '限制性表述绝不能被当作友好证据'
    );
    assert.equal(
      deriveFriendlyLevel([evidence({ quote: '太短' })]),
      'unverified',
      '原句过短不算证据'
    );
    assert.equal(
      deriveFriendlyLevel([evidence({ status: 'pending' })]),
      'unverified',
      '未审核通过的证据不生效'
    );
    assert.equal(
      deriveFriendlyLevel([evidence({ sourceUrl: 'javascript:alert(1)' })]),
      'unverified',
      '非法来源不算证据'
    );
    assert.equal(deriveFriendlyLevel([]), 'unverified', '没有证据就是未见依据');
  }
);

test('限制性信号可被单独识别，用于风险提示', { skip: types ? false : '无法加载 TS 契约' }, () => {
  const { hasRestrictionEvidence } = types;
  assert.equal(hasRestrictionEvidence([evidence({ direction: 'negative' })]), true);
  assert.equal(hasRestrictionEvidence([evidence()]), false);
});

test(
  '岗位契约不再包含任何由模型断言的「友好」布尔字段',
  { skip: types ? false : '无法加载 TS 契约' },
  () => {
    const { jobPostingSchema } = types;
    const parsed = jobPostingSchema.parse({
      company: '示例公司',
      role: '前端开发实习',
      salary: '200/天',
      location: '杭州',
      tags: ['实习'],
      url: 'https://campus.example.com/job/1',
    });
    assert.equal(
      'doubleNonFriendly' in parsed,
      false,
      'jobPostingSchema 不应再有 doubleNonFriendly 字段'
    );
    assert.equal(parsed.evidenceQuote, undefined, 'evidenceQuote 缺省即视为未验证');
  }
);

test('冷启动种子：每条证据都必须带原文摘录与可点击来源', () => {
  const seed = readJson('apps/web/src/lib/hub-seed.json');
  const signals = new Set([
    'degree_barrier',
    'school_list',
    'bonus',
    'historical_admit',
    'policy',
    'deadline',
  ]);
  assert.ok(seed.evidence.length >= 5, `种子证据应至少 5 条，当前 ${seed.evidence.length} 条`);
  // 同一页面可能产出多条证据（如同时含「学历门槛」与「不限专业」），因此校验 (来源|原文) 组合唯一
  const pairs = seed.evidence.map((e) => e.sourceUrl + '|' + e.quote);
  assert.equal(new Set(pairs).size, pairs.length, '种子证据存在完全重复的（来源 + 原文）组合');
  assert.ok(
    seed.evidence.some((e) => e.signal === 'policy' && e.status === 'approved'),
    '必须至少有一条已通过的政策类证据'
  );
  for (const item of seed.evidence) {
    assert.ok(item.quote.trim().length >= 8, `证据 ${item.id} 的原文摘录少于 8 字`);
    assert.match(item.sourceUrl, /^https?:\/\//, `证据 ${item.id} 的来源必须是 http(s) 链接`);
    assert.ok(signals.has(item.signal), `证据 ${item.id} 的信号类型非法`);
    assert.ok(['A', 'B', 'C'].includes(item.credibility), `证据 ${item.id} 的可信度非法`);
    assert.ok(
      ['approved', 'pending', 'rejected'].includes(item.status),
      `证据 ${item.id} 的状态非法`
    );
  }
});

test('白名单：显式名单达标、无重复域名，且配置了域名空间规则', () => {
  const data = readJson('apps/web/src/lib/whitelist.json');
  const { entries, patterns } = data;

  assert.ok(Array.isArray(entries), 'whitelist.json 必须包含 entries 数组');
  assert.ok(entries.length >= 30, `显式白名单应不少于 30 个域名，当前 ${entries.length} 个`);
  const domains = entries.map((e) => e.domain);
  assert.equal(new Set(domains).size, domains.length, '白名单存在重复域名');
  for (const entry of entries) {
    assert.ok(entry.domain && !entry.domain.includes('/'), `域名格式不正确：${entry.domain}`);
    assert.ok(['official', 'authoritative'].includes(entry.tier), `${entry.domain} 的 tier 非法`);
    assert.ok(
      ['gov', 'company', 'university', 'platform'].includes(entry.category),
      `${entry.domain} 的 category 非法`
    );
  }

  // 域名空间规则：gov.cn 全站 + edu.cn 的就业子站（覆盖数量庞大的高校就业网）
  assert.ok(Array.isArray(patterns) && patterns.length >= 2, '必须配置域名空间规则');
  const suffixes = patterns.map((p) => p.suffix);
  assert.ok(suffixes.includes('gov.cn'), '缺少 gov.cn 域名空间规则');
  assert.ok(suffixes.includes('edu.cn'), '缺少 edu.cn 就业子站规则');
  const edu = patterns.find((p) => p.suffix === 'edu.cn');
  assert.ok(Array.isArray(edu.labels) && edu.labels.includes('job'), 'edu.cn 规则应包含 job 前缀');
  assert.ok(edu.labels.includes('career'), 'edu.cn 规则应包含 career 前缀');
});

test('回归防护：信息中枢不再使用匿名占位岗位与未经验证的友好标签', () => {
  const page = readFileSync(join(root, 'apps/web/src/app/(main)/jobs/page.tsx'), 'utf8');
  assert.equal(page.includes('jobs-data.json'), false, '信息中枢不应再引用匿名占位岗位库');
  assert.equal(
    page.includes('firstDegreeFriendly'),
    false,
    '信息中枢不应再读取未经验证的友好布尔值'
  );
  assert.ok(page.includes('deriveFriendlyLevel'), '信息中枢的标签必须由 deriveFriendlyLevel 计算');
});

test('数据库层强制证据规则：通过审核必须有原文摘录，且只允许约定内状态流转', () => {
  const sql = readFileSync(join(root, 'supabase/migrations/007_evidence_hub.sql'), 'utf8');
  assert.ok(
    sql.includes('hub_contributions_approved_needs_quote'),
    '缺少「通过审核必须带原文摘录」约束'
  );
  assert.ok(sql.includes('hub_contribution_guard_transition'), '缺少状态机触发器');
  assert.ok(sql.includes('evidence_items_source_is_url'), '缺少来源链接格式约束');
});

test('回归防护：匿名占位岗位库已删除，不再回流', () => {
  assert.equal(
    existsSync(join(root, 'apps/web/src/lib/jobs-data.json')),
    false,
    'jobs-data.json（24 条「某公司」匿名占位岗位）应已删除，禁止再引入'
  );
});

test('审核权限必须来自登录会话，不再接受客户端声明的角色', () => {
  const route = readFileSync(join(root, 'apps/web/src/app/api/hub/contributions/route.ts'), 'utf8');
  // 注释里可以提到 x-hub-role（用于说明历史决策），但绝不能真的去读它
  assert.equal(
    route.includes("headers.get('x-hub-role')") || route.includes('headers.get("x-hub-role")'),
    false,
    '审核接口不得再读取可伪造的 x-hub-role 请求头'
  );
  assert.ok(route.includes('getSessionRole'), '审核接口必须通过 getSessionRole() 读取会话角色');
  assert.ok(route.includes('401'), '未登录必须返回 401');
  assert.ok(route.includes('403'), '登录但无审核角色必须返回 403');

  const sessionRole = readFileSync(join(root, 'apps/web/src/lib/session-role.ts'), 'utf8');
  assert.ok(sessionRole.includes("from '@/auth'"), 'session-role 必须基于 NextAuth 的 auth()');
  assert.ok(sessionRole.includes('isReviewer'), 'session-role 必须计算 isReviewer');

  const auth = readFileSync(join(root, 'apps/web/src/auth.ts'), 'utf8');
  assert.ok(auth.includes('token.role'), 'JWT 回调必须把角色写入 token');
  assert.ok(auth.includes('role: user.role'), '凭据登录必须返回用户角色');

  const users = readFileSync(join(root, 'apps/web/src/lib/auth-users.ts'), 'utf8');
  assert.ok(users.includes("'teacher'"), '必须存在教师演示账号');
  assert.ok(users.includes("'admin'"), '必须存在管理员演示账号');
});
