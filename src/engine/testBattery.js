import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readHookLog } from './hookLog.js';
import { resolveClaudeCommand } from './claudeCli.js';

/**
 * Runs a Tier 3 mission's held-out prompt battery (docs/DESIGN.md#tier-3
 * --mastery) against the player's own `claude` CLI, inside the mission
 * sandbox. Grading never looks at what the model said — only whether the
 * expected tool call did or didn't fire, per prompt.
 *
 * tests.json shape:
 *   [
 *     { "prompt": "...", "expect": { "tool": "Skill", "name": "...", "shouldFire": true } },
 *     ...
 *   ]
 */
export function runTestBattery(mission, { sandboxDir, hookLogPath }) {
  const testsPath = join(mission.path, 'tests.json');
  if (!existsSync(testsPath)) {
    throw new Error(`${mission.id} has no tests.json — not a Tier 3 mission?`);
  }
  const tests = JSON.parse(readFileSync(testsPath, 'utf8'));

  return tests.map((test) => {
    const before = readHookLog(hookLogPath).length;

    const { bin, prefixArgs } = resolveClaudeCommand();
    spawnSync(bin, [...prefixArgs, '-p', test.prompt], { cwd: sandboxDir, encoding: 'utf8' });

    const after = readHookLog(hookLogPath);
    const newEvents = after.slice(before);
    const fired = newEvents.some(
      (e) => e.tool === test.expect.tool && (!test.expect.name || e.name === test.expect.name)
    );

    return {
      prompt: test.prompt,
      expected: test.expect.shouldFire,
      actual: fired,
      passed: fired === test.expect.shouldFire,
    };
  });
}
