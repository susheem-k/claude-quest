import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDirAsync } from '../helpers/sandbox.js';
import { gradeMission } from '../../src/engine/gradeMission.js';

// Tier 3/4 dispatch (runTestBattery / runJudge) both spawn a real `claude`
// process, so they're exercised by the live suite (test/live/), not here —
// mocking them would just be re-testing a stub. This file covers the tier
// 1/2 check.js path, the ungraded shortcut, and the missing-check.js error,
// all pure and fast.

function fakeMission(root, overrides = {}) {
  return {
    key: 'arc/mission',
    path: join(root, 'mission'),
    tier: 1,
    ...overrides,
  };
}

describe('gradeMission.js', () => {
  test('ungraded missions pass unconditionally, without needing a check.js', async () => {
    await withTempDirAsync(async (root) => {
      mkdirSync(join(root, 'mission'), { recursive: true });
      const result = await gradeMission(root, fakeMission(root, { ungraded: true }));
      assert.equal(result.passed, true);
      assert.match(result.message, /ungraded/);
    });
  });

  test('tier 1/2 missions call check.js with (sandboxDir, { runRoot })', async () => {
    await withTempDirAsync(async (root) => {
      const missionPath = join(root, 'mission');
      mkdirSync(missionPath, { recursive: true });
      writeFileSync(
        join(missionPath, 'check.js'),
        `export function check(sandboxDir, ctx) {
           return { passed: true, message: JSON.stringify({ sandboxDir, ctx }) };
         }`
      );
      const result = await gradeMission(root, fakeMission(root), { runRoot: '/some/run/root' });
      assert.equal(result.passed, true);
      const relayed = JSON.parse(result.message);
      assert.equal(relayed.sandboxDir, result.sandboxDir);
      assert.equal(relayed.ctx.runRoot, '/some/run/root');
    });
  });

  test('a tier 1/2 mission with no check.js throws rather than silently passing', async () => {
    await withTempDirAsync(async (root) => {
      mkdirSync(join(root, 'mission'), { recursive: true });
      await assert.rejects(
        () => gradeMission(root, fakeMission(root)),
        /has no check\.js and isn't Tier 3/
      );
    });
  });

  test('check.js failure result is relayed as-is', async () => {
    await withTempDirAsync(async (root) => {
      const missionPath = join(root, 'mission');
      mkdirSync(missionPath, { recursive: true });
      writeFileSync(
        join(missionPath, 'check.js'),
        `export function check() { return { passed: false, message: 'nope, not yet' }; }`
      );
      const result = await gradeMission(root, fakeMission(root));
      assert.equal(result.passed, false);
      assert.equal(result.message, 'nope, not yet');
    });
  });
});
