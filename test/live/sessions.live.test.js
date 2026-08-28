import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { withLiveSandbox, claudeP } from '../helpers/live.js';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';
import { provision } from '../../src/engine/provision.js';
import { check as whereYouLeftOffCheck } from '../../missions/01-commands/where-you-left-off/check.js';

const missions = loadMissions();

describe('Where You Left Off — SessionStart hook + --resume discipline, live', () => {
  test('resuming the first of two sessions passes; resuming the second fails', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '01-commands/where-you-left-off');
      const sandboxDir = await provision(root, mission);

      const first = claudeP(sandboxDir, 'This is session one.');
      const second = claudeP(sandboxDir, 'This is session two.');
      assert.notEqual(first.session_id, second.session_id, 'each -p call should start its own session');

      // Resuming the wrong (second) session should not satisfy the mission.
      claudeP(sandboxDir, 'ok', ['--resume', second.session_id]);
      assert.equal(
        whereYouLeftOffCheck(sandboxDir).passed,
        false,
        'landing back in the second session should not pass'
      );

      // Resuming the first, specifically, should.
      claudeP(sandboxDir, 'What did I ask you to remember?', ['--resume', first.session_id]);
      assert.equal(
        whereYouLeftOffCheck(sandboxDir).passed,
        true,
        'landing back in the first session should pass'
      );
    });
  });
});
