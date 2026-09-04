import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

test('repository runtime and package-manager contract stay aligned', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.packageManager, 'npm@10.9.7');
  assert.equal(pkg.engines?.node, '>=22.18.0 <23');
  assert.equal(readFileSync(join(root, '.nvmrc'), 'utf8').trim(), '22.22.2');
  assert.equal(pkg.scripts?.test, 'node --test');
});
test('repository does not retain generated runtime output or deleted auth modules', () => {
  const trackedGenerated = execFileSync(
    'git',
    ['ls-files', '--', '.wrangler', '.turbo', '.next', 'apps/worker/.wrangler'],
    { cwd: root, encoding: 'utf8' }
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((relativePath) => existsSync(join(root, relativePath)));

  assert.deepEqual(trackedGenerated, []);
  assert.equal(existsSync(join(root, 'apps/web/src/lib/auth.tsx')), false);
});
