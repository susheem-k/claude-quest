import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withLiveSandbox, claudeP } from '../helpers/live.js';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';
import { provision } from '../../src/engine/provision.js';
import { check as giveTheCraftHandsCheck } from '../../missions/04-tooling/give-the-craft-hands/check.js';
import { check as widenTheHeraldCheck } from '../../missions/04-tooling/widen-the-herald/check.js';

const missions = loadMissions();

describe('Give the Craft Hands — a skill extended to read/write via Bash, live', () => {
  test('the extended well-wisher increments blessing-count.txt and check.js passes', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '04-tooling/give-the-craft-hands');
      const sandboxDir = await provision(root, mission);
      const skillPath = join(sandboxDir, '.claude', 'skills', 'well-wisher', 'SKILL.md');
      const extended = readFileSync(skillPath, 'utf8')
        .replace(
          '---\nname: well-wisher',
          '---\nname: well-wisher\nallowed-tools: Bash'
        )
        .replace(
          'Then, using the Bash tool, run this exact command',
          'Then, using the Bash tool, read blessing-count.txt, add one to the number in it, and ' +
            'write the result back to blessing-count.txt (just the number, nothing else).\n\n' +
            'Then, using the Bash tool, run this exact command'
        );
      writeFileSync(skillPath, extended);

      claudeP(sandboxDir, 'Wish me luck.');
      assert.equal(giveTheCraftHandsCheck(sandboxDir).passed, true);
    });
  });
});

describe("Widen the Herald's Reach — a subagent extended to read/write via Bash, live", () => {
  test('the widened herald appends to town-ledger.txt and check.js passes', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '04-tooling/widen-the-herald');
      const sandboxDir = await provision(root, mission);
      const heraldPath = join(sandboxDir, '.claude', 'agents', 'herald.md');
      writeFileSync(
        heraldPath,
        `---
name: herald
description: Delegate to this agent when the player wants a message recorded in the town ledger.
tools: Skill, Bash
---

When asked to record something, use the Bash tool to append the requested message as
a new line to town-ledger.txt, then acknowledge that it's been recorded.
`
      );

      claudeP(sandboxDir, 'Ask the herald to record that the harvest festival begins tomorrow.');
      assert.equal(widenTheHeraldCheck(sandboxDir).passed, true);
    });
  });
});
