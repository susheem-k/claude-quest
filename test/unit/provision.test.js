import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDirAsync } from '../helpers/sandbox.js';
import { provision, sandboxDirFor, resetSandboxes } from '../../src/engine/provision.js';

function fakeMission(missionRoot, key) {
  return { key, path: join(missionRoot, 'mission') };
}

describe('provision.js', () => {
  test('sandboxDirFor is <root>/runs/<mission key>', () => {
    assert.equal(
      sandboxDirFor('/root', { key: 'arc/mission-id' }),
      join('/root', 'runs', 'arc/mission-id')
    );
  });

  test('provision creates the sandbox even when the mission has no setup.js', async () => {
    await withTempDirAsync(async (root) => {
      const missionPath = join(root, 'mission');
      mkdirSync(missionPath, { recursive: true });
      const dir = await provision(root, fakeMission(root, 'arc/no-setup'));
      assert.ok(existsSync(dir));
    });
  });

  test('provision runs setup.js exactly once across repeated calls', async () => {
    await withTempDirAsync(async (root) => {
      const missionPath = join(root, 'mission');
      mkdirSync(missionPath, { recursive: true });
      writeFileSync(
        join(missionPath, 'setup.js'),
        `import { writeFileSync, existsSync, readFileSync } from 'node:fs';
         import { join } from 'node:path';
         export function setup(dir) {
           const counterPath = join(dir, 'counter.txt');
           const current = existsSync(counterPath) ? Number(readFileSync(counterPath, 'utf8')) : 0;
           writeFileSync(counterPath, String(current + 1));
         }`
      );
      const mission = fakeMission(root, 'arc/counted');
      await provision(root, mission);
      await provision(root, mission);
      const dir = await provision(root, mission);
      assert.equal(readFileSync(join(dir, 'counter.txt'), 'utf8'), '1');
    });
  });

  test('a setup.js that throws leaves no marker, so the next provision() retries it', async () => {
    await withTempDirAsync(async (root) => {
      const missionPath = join(root, 'mission');
      mkdirSync(missionPath, { recursive: true });
      // Fails the first time it actually runs, succeeds after — a sentinel
      // file (not the provisioned marker) tracks that for the test.
      writeFileSync(
        join(missionPath, 'setup.js'),
        `import { writeFileSync, existsSync } from 'node:fs';
         import { join } from 'node:path';
         export function setup(dir) {
           const sentinel = join(dir, 'attempted.txt');
           if (!existsSync(sentinel)) {
             writeFileSync(sentinel, '');
             throw new Error('boom');
           }
         }`
      );
      const mission = fakeMission(root, 'arc/flaky');
      const dir = sandboxDirFor(root, mission);

      await assert.rejects(() => provision(root, mission), /boom/);
      assert.ok(existsSync(join(dir, 'attempted.txt')), 'the half-run attempt should be visible');
      assert.ok(!existsSync(join(dir, '.provisioned')), 'no marker after a throw');

      // Second attempt: setup.js sees its own sentinel and succeeds.
      await provision(root, mission);
      assert.ok(existsSync(join(dir, '.provisioned')));
    });
  });

  test('resetSandboxes removes the whole runs/ tree', async () => {
    await withTempDirAsync(async (root) => {
      const missionPath = join(root, 'mission');
      mkdirSync(missionPath, { recursive: true });
      const dir = await provision(root, fakeMission(root, 'arc/one'));
      assert.ok(existsSync(dir));
      resetSandboxes(root);
      assert.ok(!existsSync(dir));
    });
  });
});
