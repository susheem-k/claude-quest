import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withLiveSandbox, claudeP } from '../helpers/live.js';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';
import { provision } from '../../src/engine/provision.js';
import { runTestBattery } from '../../src/engine/testBattery.js';
import { hookLogPath } from '../../src/engine/sandbox.js';
import { check as callOnThemCheck } from '../../missions/03-subagents/call-on-them/check.js';
import { check as borrowedCraftCheck } from '../../missions/03-subagents/borrowed-craft/check.js';

const missions = loadMissions();

describe('Call on Them — explicit subagent invocation, live', () => {
  test('town-crier fires when asked for by name', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '03-subagents/call-on-them');
      const sandboxDir = await provision(root, mission);
      claudeP(sandboxDir, 'Use the town-crier subagent to make an announcement.');
      assert.equal(callOnThemCheck(sandboxDir).passed, true);
    });
  });
});

describe('Their Own Judgment — implicit subagent delegation battery, live', () => {
  test('a precisely worded description passes all 4 held-out prompts', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '03-subagents/their-own-judgment');
      const sandboxDir = await provision(root, mission);
      const agentPath = join(sandboxDir, '.claude', 'agents', 'town-crier.md');
      const fixed = readFileSync(agentPath, 'utf8').replace(
        'description: Handles announcements.',
        'description: Delegate to this agent whenever the player wants a public announcement made or broadcast — a festival, a meeting change, an event. Not for ordinary requests unrelated to announcing something.'
      );
      writeFileSync(agentPath, fixed);

      const results = runTestBattery(mission, { sandboxDir, hookLogPath: hookLogPath(sandboxDir) });
      const failed = results.filter((r) => !r.passed);
      assert.deepEqual(failed, [], `expected all 4 prompts to pass, got: ${JSON.stringify(results, null, 2)}`);
    });
  });
});

describe('Borrowed Craft — a subagent invoking a skill, live', () => {
  test('herald fires, and it reaches for well-wisher rather than answering itself', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '03-subagents/borrowed-craft');
      const sandboxDir = await provision(root, mission);
      claudeP(sandboxDir, 'Have the herald deliver a well-wish.');
      assert.equal(borrowedCraftCheck(sandboxDir).passed, true);
    });
  });
});
