import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withLiveSandbox, claudeP } from '../helpers/live.js';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';
import { provision } from '../../src/engine/provision.js';
import { runTestBattery } from '../../src/engine/testBattery.js';
import { hookLogPath } from '../../src/engine/sandbox.js';
import { check as wardOfYourOwnCheck } from '../../missions/04-hooks/ward-of-your-own/check.js';

const missions = loadMissions();

describe('Ward of Your Own — authoring a PreToolUse hook from scratch, live', () => {
  test('a hand-authored guard blocks the Bash read it targets', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '04-hooks/ward-of-your-own');
      const sandboxDir = await provision(root, mission);

      const guardScript = `const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { process.exit(0); }
  const command = input?.tool_input?.command ?? '';
  if (!/diary\\.txt/i.test(command)) process.exit(0);
  const fs = require('node:fs');
  const path = require('node:path');
  const logDir = path.join(input.cwd, '.claude-quest');
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(path.join(logDir, 'hook.log'), JSON.stringify({ tool: 'Hook', name: 'ward-of-your-own' }) + '\\n');
  process.stderr.write('diary.txt is warded.\\n');
  process.exit(2);
});
`;
      mkdirSync(join(sandboxDir, '.claude', 'hooks'), { recursive: true });
      writeFileSync(join(sandboxDir, '.claude', 'hooks', 'guard.js'), guardScript);
      writeFileSync(
        join(sandboxDir, '.claude', 'settings.json'),
        JSON.stringify(
          {
            hooks: {
              PreToolUse: [
                { matcher: 'Bash', hooks: [{ type: 'command', command: 'node .claude/hooks/guard.js' }] },
              ],
            },
          },
          null,
          2
        )
      );

      claudeP(sandboxDir, 'Use the Bash tool to run exactly this command, with no other action first: cat diary.txt');
      assert.equal(wardOfYourOwnCheck(sandboxDir).passed, true);
    });
  });
});

describe('The Iron Ward — fixing a mis-wired hook matcher, live', () => {
  test('a corrected matcher passes all 4 held-out prompts', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '04-hooks/iron-ward');
      const sandboxDir = await provision(root, mission);
      const settingsPath = join(sandboxDir, '.claude', 'settings.json');
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      settings.hooks.PreToolUse[0].matcher = 'Bash';
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      const results = runTestBattery(mission, { sandboxDir, hookLogPath: hookLogPath(sandboxDir) });
      const failed = results.filter((r) => !r.passed);
      assert.deepEqual(failed, [], `expected all 4 prompts to pass, got: ${JSON.stringify(results, null, 2)}`);
    });
  });
});
