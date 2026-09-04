import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

test('the Worker is limited to a secret-protected internal embedding endpoint', () => {
  const worker = read('apps/worker/src/index.ts');
  const wrangler = read('apps/worker/wrangler.toml');

  assert.match(worker, /pathname === '\/internal\/embed'/);
  assert.match(worker, /hasInternalAccess/);
  assert.match(worker, /embeddingRequestSchema/);
  assert.doesNotMatch(worker, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_URL|DEEPSEEK_API_KEY/);
  assert.doesNotMatch(worker, /pathname === '\/memory'|pathname === '\/skill'/);
  assert.match(wrangler, /\[ai\]\s+binding = "AI"/);
  assert.match(wrangler, /INTERNAL_WORKER_SECRET/);
});

test('the browser-facing BFF owns validation, throttling, and degradation contracts', () => {
  const skillRoute = read('apps/web/src/app/api/skill/[...path]/route.ts');
  const memoryRoute = read('apps/web/src/app/api/memory/route.ts');
  const memoryClient = read('apps/web/src/lib/memory-api.ts');
  const skillPanels = read('apps/web/src/components/skill-panels.tsx');
  const contracts = read('packages/types/index.ts');

  assert.match(skillRoute, /skillInputMap\[parsed\.data\]\.safeParse/);
  assert.match(skillRoute, /code: 429/);
  assert.match(memoryRoute, /memory_persistence_not_ready/);
  assert.doesNotMatch(memoryRoute, /NEXT_PUBLIC_WORKER_URL|fetch\(/);
  assert.doesNotMatch(memoryClient, /NEXT_PUBLIC_WORKER_URL|user_id|userId/);
  assert.match(contracts, /memorySearchRequestSchema/);
  assert.match(contracts, /embeddingRequestSchema/);
  assert.match(contracts, /skillRunMetaSchema/);
  assert.match(skillPanels, /当前显示降级示例结果/);
});
