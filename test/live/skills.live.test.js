import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withLiveSandbox, claudeP } from '../helpers/live.js';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';
import { provision } from '../../src/engine/provision.js';
import { runTestBattery } from '../../src/engine/testBattery.js';
import { hookLogPath } from '../../src/engine/sandbox.js';
import { check as sayTheWordCheck } from '../../missions/02-extensibility/skill-invocation/check.js';
import { check as firstCraftCheck } from '../../missions/02-extensibility/first-craft/check.js';

const missions = loadMissions();

describe('Say the Word — skill invocation, live', () => {
  test('torch-lighter fires on a direct natural-language request', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '02-extensibility/skill-invocation');
      const sandboxDir = await provision(root, mission);
      claudeP(sandboxDir, 'Light the torch.');
      assert.equal(sayTheWordCheck(sandboxDir).passed, true);
    });
  });
});

describe('First Craft — authoring + invoking a skill from scratch, live', () => {
  test('a hand-authored well-wisher skill fires and check.js passes', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '02-extensibility/first-craft');
      const sandboxDir = await provision(root, mission);
      const skillDir = join(sandboxDir, '.claude', 'skills', 'well-wisher');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, 'SKILL.md'),
        `---
name: well-wisher
description: Offers a friendly well-wish. Use when the player wants a blessing or good wishes.
---

Say something warm and encouraging to the player.

Then, using the Bash tool, run this exact command with no explanation and no other output:

\`\`\`
printf '{"tool":"Skill","name":"well-wisher"}\\n' >> .claude-quest/hook.log
\`\`\`
`
      );
      claudeP(sandboxDir, 'Give me a well wish.');
      assert.equal(firstCraftCheck(sandboxDir).passed, true);
    });
  });
});

describe('Second Craft — auto-invocation battery against the fixed description, live', () => {
  test('a precisely worded description passes all 4 held-out prompts', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '02-extensibility/extend-well-wisher');
      const sandboxDir = await provision(root, mission);
      // setup.js seeds the deliberately-broken "Says something nice."
      // description — overwrite it with the fixed one before running the
      // battery, the same fix a player is meant to arrive at.
      const skillPath = join(sandboxDir, '.claude', 'skills', 'well-wisher', 'SKILL.md');
      const fixed = readFileSync(skillPath, 'utf8').replace(
        'description: Says something nice.',
        'description: Offers a well-wish, blessing, or good-luck send-off. Use when someone wants to be wished luck or good fortune, not for general compliments or feedback.'
      );
      writeFileSync(skillPath, fixed);

      const results = runTestBattery(mission, { sandboxDir, hookLogPath: hookLogPath(sandboxDir) });
      const failed = results.filter((r) => !r.passed);
      assert.deepEqual(failed, [], `expected all 4 prompts to pass, got: ${JSON.stringify(results, null, 2)}`);
    });
  });
});
