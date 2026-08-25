import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { provision, sandboxDirFor } from './provision.js';
import { runTestBattery } from './testBattery.js';
import { hookLogPath } from './sandbox.js';
import { runJudge } from './judge.js';

/**
 * Runs whichever grading path a mission's tier calls for
 * (docs/DESIGN.md#mission-tiers) and returns a tier-agnostic result:
 *   { passed, sandboxDir, message?, results? }
 *
 * Tier 1/2 missions are graded by their own check.js, reading sandbox state
 * or hook telemetry that already exists — the engine never drives a live
 * session on the player's behalf for these.
 *
 * Tier 3 missions are graded by running their held-out test-prompt battery,
 * which *does* invoke the player's own `claude` CLI (see testBattery.js) —
 * that's the point for this tier, not a shortcut around it.
 *
 * Tier 4 missions are graded by a rubric-driven judge call, also run
 * against the player's own `claude` CLI, from a fresh isolated directory
 * (see judge.js) — the one tier where the verdict itself is genuinely
 * non-deterministic, so it's reported with per-criterion reasons rather
 * than a bare pass/fail.
 */
export async function gradeMission(root, mission) {
  const sandboxDir = await provision(root, mission);

  if (mission.tier === 3) {
    const results = runTestBattery(mission, { sandboxDir, hookLogPath: hookLogPath(sandboxDir) });
    const passed = results.length > 0 && results.every((r) => r.passed);
    return { passed, sandboxDir, results };
  }

  if (mission.tier === 4) {
    const { passed, criteria, message } = runJudge(mission, sandboxDir);
    return { passed, sandboxDir, criteria, message };
  }

  const checkPath = join(mission.path, 'check.js');
  if (!existsSync(checkPath)) {
    throw new Error(`${mission.key} has no check.js and isn't Tier 3 — can't be graded.`);
  }
  const mod = await import(pathToFileURL(checkPath).href);
  const { passed, message } = mod.check(sandboxDir);
  return { passed, sandboxDir, message };
}

export { sandboxDirFor };
